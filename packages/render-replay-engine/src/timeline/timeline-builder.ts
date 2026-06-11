import type { ReplayFrame, ReplayTimeline, ReplayTimelineEntry, ReplaySegment, ReplaySessionId, ReplayEngineOptions } from '../types/index.js';

const DEFAULT_SEGMENT_WINDOW = 20;

const toSeverity = (score: number | null): 'ok' | 'warn' | 'critical' => {
	if (score === null) return 'ok';
	if (score < 50) return 'critical';
	if (score < 70) return 'warn';
	return 'ok';
};

const classifyTrend = (firstScore: number | null, lastScore: number | null, scoreRange: number): { trend: ReplaySegment['trend']; label: string } => {
	if (firstScore === null || lastScore === null) return { trend: 'stable', label: 'Unknown' };
	if (scoreRange > 30) return { trend: 'volatile', label: 'Volatility' };
	const delta = lastScore - firstScore;
	if (delta < -10) return { trend: 'degrading', label: 'Degradation' };
	if (delta > 10) return { trend: 'improving', label: 'Recovery' };
	return { trend: 'stable', label: 'Stable' };
};

const buildSegments = (frames: readonly ReplayFrame[], windowSize: number): readonly ReplaySegment[] => {
	if (frames.length === 0) return Object.freeze([]);

	type WindowResult = {
		startFrameIndex: number;
		endFrameIndex: number;
		trend: ReplaySegment['trend'];
		label: string;
		avgScore: number | null;
	};

	const windows: WindowResult[] = [];

	for (let i = 0; i < frames.length; i += windowSize) {
		const slice = frames.slice(i, i + windowSize);
		const endIdx = slice[slice.length - 1]!.frameIndex;
		const scores = slice.map((f) => f.score).filter((s): s is number => s !== null);

		const firstScore = scores.length > 0 ? scores[0]! : null;
		const lastScore = scores.length > 0 ? scores[scores.length - 1]! : null;
		const scoreRange = scores.length > 0 ? Math.max(...scores) - Math.min(...scores) : 0;
		const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

		const { trend, label } = classifyTrend(firstScore, lastScore, scoreRange);
		windows.push({ startFrameIndex: slice[0]!.frameIndex, endFrameIndex: endIdx, trend, label, avgScore });
	}

	// merge adjacent windows with same trend
	const segments: ReplaySegment[] = [];
	for (const window of windows) {
		const last = segments[segments.length - 1];
		if (last && last.trend === window.trend && last.label === window.label) {
			const mergedScores = [last.avgScore, window.avgScore].filter((s): s is number => s !== null);
			const newAvg = mergedScores.length > 0 ? mergedScores.reduce((a, b) => a + b, 0) / mergedScores.length : null;
			segments[segments.length - 1] = Object.freeze<ReplaySegment>({
				...last,
				endFrameIndex: window.endFrameIndex,
				avgScore: newAvg,
			});
		} else {
			segments.push(Object.freeze<ReplaySegment>(window));
		}
	}

	return Object.freeze(segments);
};

export const buildTimeline = (sessionId: ReplaySessionId, frames: readonly ReplayFrame[], duration: number | null, options: ReplayEngineOptions): ReplayTimeline => {
	const enableTimeline = options.enableTimeline !== false;
	const enableSegments = options.enableSegments !== false;
	const windowSize = options.segmentWindowSize ?? DEFAULT_SEGMENT_WINDOW;

	if (!enableTimeline) {
		return Object.freeze<ReplayTimeline>({
			sessionId,
			entries: Object.freeze([]),
			duration,
			segments: Object.freeze([]),
		});
	}

	const entries: readonly ReplayTimelineEntry[] = Object.freeze(
		frames.map(
			(frame): ReplayTimelineEntry =>
				Object.freeze<ReplayTimelineEntry>({
					frameIndex: frame.frameIndex,
					renderNumber: frame.renderNumber,
					wallTimestamp: frame.wallTimestamp,
					relativeMs: frame.relativeMs,
					score: frame.score,
					grade: frame.grade,
					severity: toSeverity(frame.score),
					hasUnstableProps: frame.hasUnstableProps,
					signalKind: frame.signalKind,
				})
		)
	);

	const segments = enableSegments ? buildSegments(frames, windowSize) : Object.freeze<ReplaySegment[]>([]);

	return Object.freeze<ReplayTimeline>({ sessionId, entries, duration, segments });
};
