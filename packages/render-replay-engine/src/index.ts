// ── Types ─────────────────────────────────────────────────────────────────────
export type {
	ReplaySessionId,
	ReplayFrameId,
	ReplayBookmarkId,
	ReplayFrame,
	ReplaySessionStats,
	ReplayPruningInfo,
	ReplayTimelineEntry,
	ReplaySegment,
	ReplayTimeline,
	ReplaySession,
	ReplayCursor,
	ReplayFilter,
	ReplayFilterResult,
	ReplayFilterPreset,
	ReplayBookmark,
	ReplayBookmarkCreateParams,
	ReplayBookmarkUpdate,
	ReplayBookmarkStore,
	ReplayNavigator,
	ReplayEngine,
	ReplayBufferSource,
	ReplayEventsSource,
	ReplaySerializedSource,
	ReplaySource,
	ReplayPruningStrategy,
	ReplayEngineOptions,
	ReplayErrorCode,
	// re-exported telemetry types used in public API
	RenderEvent,
	PropChangeEvent,
	FrequencyEvent,
	ScoreEvent,
	RecommendationEvent,
	TelemetryHealthGrade,
	TelemetryMemoClassification,
	TelemetryFrequencyClass,
	TelemetrySignalKind,
	TelemetryBuffer,
	TelemetryEvent,
} from './types/index.js';

// ── Error ─────────────────────────────────────────────────────────────────────
export { ReplayError, createReplayError } from './errors/replay-error.js';

// ── Source constructors ───────────────────────────────────────────────────────
export { fromEvents } from './sources/from-events.js';
export { fromBuffer } from './sources/from-buffer.js';
export { fromSerialized } from './sources/from-serialized.js';

// ── Engine factory ────────────────────────────────────────────────────────────
export { createReplayEngine, buildReplaySessions } from './engine/replay-engine.js';

// ── Filter utilities (pure, usable without engine) ───────────────────────────
export { applyFilter, mergeFilters, withFilter } from './filter/filter.js';
export { applyPreset } from './filter/filter-presets.js';

// ── Bookmark store (for consumers who manage their own store) ─────────────────
export { createBookmarkStore } from './bookmarks/bookmark-store.js';
