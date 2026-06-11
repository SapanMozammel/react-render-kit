import type { TelemetryEvent } from '@sapanmozammel/render-telemetry-core';
import type { ReplaySession, ReplayPruningInfo, ReplayEngineOptions } from '../types/index.js';
import { buildFrames } from './frame-builder.js';
import { buildSessionStats } from '../stats/session-stats.js';
import { buildTimeline } from '../timeline/timeline-builder.js';

const UNKNOWN_SCHEMA = 'unknown';

const partitionBySession = (events: readonly TelemetryEvent[]): Map<string, TelemetryEvent[]> => {
	const map = new Map<string, TelemetryEvent[]>();
	for (const event of events) {
		const bucket = map.get(event.sessionId);
		if (bucket) {
			bucket.push(event);
		} else {
			map.set(event.sessionId, [event]);
		}
	}
	return map;
};

const buildOneSession = (
	sessionId: string,
	rawEvents: readonly TelemetryEvent[],
	options: ReplayEngineOptions
): ReplaySession => {
	// sort by sequenceNumber (ascending)
	const events = [...rawEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

	const sessionStartEvent = events.find((e) => e.type === 'session-start');
	const sessionEndEvent = events.find((e) => e.type === 'session-end');
	const firstEvent = events[0];

	const startedAt = sessionStartEvent?.wallTimestamp ?? firstEvent?.wallTimestamp ?? 0;
	const endedAt = sessionEndEvent?.wallTimestamp ?? null;
	const durationMs = endedAt !== null ? endedAt - startedAt : null;
	const schemaVersion = sessionStartEvent?.schemaVersion ?? UNKNOWN_SCHEMA;
	const componentName = firstEvent?.componentName ?? 'Unknown';

	const allFrames = buildFrames(events, startedAt, sessionId);

	// stats and timeline reflect the full (unpruned) session
	const enableStats = options.enableStats !== false;
	const stats = enableStats
		? buildSessionStats(allFrames)
		: buildSessionStats(Object.freeze([]));

	const timeline = buildTimeline(sessionId, allFrames, durationMs, options);

	// apply pruning
	const maxFrames = options.maxFrames ?? 5000;
	let finalFrames = allFrames;
	let pruningInfo: ReplayPruningInfo;

	if (maxFrames > 0 && allFrames.length > maxFrames) {
		const originalFrameCount = allFrames.length;
		const strategy = options.pruningStrategy ?? 'fifo';

		if (strategy === 'score-weighted') {
			// drop frames with highest score first (preserve worst-performing frames)
			const sorted = [...allFrames].sort((a, b) => {
				const sa = a.score ?? -1;
				const sb = b.score ?? -1;
				return sb - sa; // highest score first
			});
			const kept = new Set(sorted.slice(maxFrames).map((f) => f.frameIndex));
			finalFrames = Object.freeze(
				[...allFrames].filter((f) => kept.has(f.frameIndex)).sort((a, b) => a.frameIndex - b.frameIndex)
			);
		} else {
			// fifo: drop oldest (lowest frameIndex), keep the last maxFrames
			finalFrames = Object.freeze([...allFrames].slice(allFrames.length - maxFrames));
		}

		pruningInfo = Object.freeze<ReplayPruningInfo>({
			pruned: true,
			originalFrameCount,
			prunedFrameCount: originalFrameCount - maxFrames,
			strategy,
		});
	} else {
		pruningInfo = Object.freeze<ReplayPruningInfo>({ pruned: false });
	}

	return Object.freeze<ReplaySession>({
		id: sessionId,
		componentName,
		startedAt,
		endedAt,
		durationMs,
		schemaVersion,
		frames: finalFrames,
		frameCount: finalFrames.length,
		timeline,
		stats,
		pruningInfo,
	});
};

export const buildSessions = (
	events: readonly TelemetryEvent[],
	options: ReplayEngineOptions
): readonly ReplaySession[] => {
	const partitioned = partitionBySession(events);
	const sessions = Array.from(partitioned.entries()).map(([sessionId, sessionEvents]) =>
		buildOneSession(sessionId, sessionEvents, options)
	);
	// sort by startedAt ascending
	sessions.sort((a, b) => a.startedAt - b.startedAt);
	return Object.freeze(sessions);
};
