import { deserializeBuffer, type TelemetryEvent } from '@sapanmozammel/render-telemetry-core';
import type { ReplaySource, ReplayEngine, ReplaySession, ReplayEngineOptions, ReplaySessionId } from '../types/index.js';
import { buildSessions } from '../builder/session-builder.js';
import { createNavigator } from '../navigation/navigator.js';
import { createBookmarkStore } from '../bookmarks/bookmark-store.js';
import { applyFilter } from '../filter/filter.js';
import { applyPreset } from '../filter/filter-presets.js';
import { ReplayError } from '../errors/replay-error.js';

const extractEvents = (source: ReplaySource): readonly TelemetryEvent[] => {
	if (source.type === 'events') return source.events;
	if (source.type === 'buffer') return source.buffer.getSnapshot().events;
	// serialized — validate JSON syntax first (deserializeBuffer swallows parse errors)
	try {
		JSON.parse(source.json);
	} catch {
		throw new ReplayError('INVALID_SERIALIZED_JSON', 'Failed to parse serialized session JSON');
	}
	const buf = deserializeBuffer(source.json);
	return buf.getSnapshot().events;
};

const makeEngine = (session: ReplaySession): ReplayEngine => {
	const bookmarks = createBookmarkStore();
	const navigate = createNavigator(session, bookmarks);

	return {
		session,
		navigate,
		bookmarks,
		applyFilter: (filter) => applyFilter(session, filter),
		applyPreset: (preset) => applyPreset(session, preset),
		getFrame: (frameIndex) => session.frames[frameIndex] ?? null,
		getFrameByRenderNumber: (renderNumber) => session.frames.find((f) => f.renderNumber === renderNumber) ?? null,
		getFrameRange: (startIndex, endIndex) => Object.freeze(session.frames.filter((f) => f.frameIndex >= startIndex && f.frameIndex <= endIndex)),
	};
};

export const buildReplaySessions = (source: ReplaySource, options: ReplayEngineOptions = {}): readonly ReplaySession[] => {
	const events = extractEvents(source);
	if (events.length === 0) throw new ReplayError('EMPTY_SOURCE', 'Source contains no events');
	return buildSessions(events, options);
};

export const createReplayEngine = (source: ReplaySource, sessionId?: ReplaySessionId, options: ReplayEngineOptions = {}): ReplayEngine => {
	const events = extractEvents(source);
	if (events.length === 0) throw new ReplayError('EMPTY_SOURCE', 'Source contains no events');

	const sessions = buildSessions(events, options);
	if (sessions.length === 0) throw new ReplayError('EMPTY_SOURCE', 'No sessions could be built from source');

	let session: ReplaySession;

	if (sessionId !== undefined) {
		const found = sessions.find((s) => s.id === sessionId);
		if (!found) {
			const available = sessions.map((s) => s.id).join(', ');
			throw new ReplayError('SESSION_NOT_FOUND', `Session "${sessionId}" not found. Available: ${available}`);
		}
		session = found;
	} else if (sessions.length > 1) {
		const available = sessions.map((s) => s.id).join(', ');
		throw new ReplayError('MULTIPLE_SESSIONS', `Multiple sessions found. Specify sessionId. Available: ${available}`);
	} else {
		session = sessions[0]!;
	}

	if (session.frameCount === 0) {
		throw new ReplayError('NO_RENDER_EVENTS', `Session "${session.id}" has no render events`);
	}

	return makeEngine(session);
};
