import type { ReplaySession } from './replay-session.js';
import type { ReplayNavigator } from './replay-navigator.js';
import type { ReplayBookmarkStore } from './replay-bookmark.js';
import type { ReplayFilter, ReplayFilterResult, ReplayFilterPreset } from './replay-filter.js';
import type { ReplayFrame } from './replay-frame.js';
import type { ReplaySessionId } from './replay-ids.js';
import type { TelemetryEvent } from '../events/event-variants.js';
import type { TelemetrySnapshot } from '../session/session.js';

// ── Source types ──────────────────────────────────────────────────────────────

export type ReplayBufferSource = {
	readonly type: 'buffer';
	// Structural — any buffer with a compatible getSnapshot() is accepted.
	readonly buffer: { getSnapshot: () => Pick<TelemetrySnapshot, 'events'> };
};

export type ReplayEventsSource = {
	readonly type: 'events';
	readonly events: readonly TelemetryEvent[];
};

export type ReplaySerializedSource = {
	readonly type: 'serialized';
	readonly json: string;
};

export type ReplaySource = ReplayBufferSource | ReplayEventsSource | ReplaySerializedSource;

// ── Engine options ────────────────────────────────────────────────────────────

export type ReplayPruningStrategy = 'fifo' | 'score-weighted';

export type ReplayEngineOptions = {
	readonly maxFrames?: number;
	readonly pruningStrategy?: ReplayPruningStrategy;
	readonly segmentWindowSize?: number;
	readonly enableStats?: boolean;
	readonly enableTimeline?: boolean;
	readonly enableSegments?: boolean;
};

// ── Engine ────────────────────────────────────────────────────────────────────

export type ReplayEngine = {
	readonly session: ReplaySession;
	readonly navigate: ReplayNavigator;
	readonly bookmarks: ReplayBookmarkStore;
	applyFilter: (filter: ReplayFilter) => ReplayFilterResult;
	applyPreset: (preset: ReplayFilterPreset) => ReplayFilterResult;
	getFrame: (frameIndex: number) => ReplayFrame | null;
	getFrameByRenderNumber: (renderNumber: number) => ReplayFrame | null;
	getFrameRange: (startIndex: number, endIndex: number) => readonly ReplayFrame[];
};

// ── Multi-session factory result ──────────────────────────────────────────────

export type ReplayEngineMap = ReadonlyMap<ReplaySessionId, ReplayEngine>;
