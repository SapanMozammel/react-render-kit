// ── Version ───────────────────────────────────────────────────────────────────
export type { SchemaVersion } from './version/schema-version.js';
export { CURRENT_SCHEMA_VERSION } from './version/schema-version.js';

// ── Identity ──────────────────────────────────────────────────────────────────
export type { ComponentId, SessionId, ComponentMeta } from './identity/component-identity.js';

// ── Lifecycle ─────────────────────────────────────────────────────────────────
export type { RenderPhase, RenderTrigger, InferredTrigger } from './lifecycle/render-lifecycle.js';

// ── Props ─────────────────────────────────────────────────────────────────────
export type { PropRefType, PropChangeKind, PropChangeEntry, PropInstability, PropDiffSnapshot } from './props/prop-diff.js';

// ── Analysis ──────────────────────────────────────────────────────────────────
export type { FrequencyClass, FrequencyMeasurement } from './analysis/frequency.js';
export type { SignalKind, MemoClassification, RenderSignal, MemoSessionSummary } from './analysis/memo.js';
export type { HealthGrade, ScoreBreakdown } from './analysis/scoring.js';

// ── Events ────────────────────────────────────────────────────────────────────
export type { EventType } from './events/event-types.js';
export type { EventBase } from './events/event-base.js';
export type {
	SessionStartEvent,
	RenderEvent,
	PropChangeEvent,
	FrequencyEvent,
	ScoreEvent,
	RecommendationEvent,
	SessionEndEvent,
	TelemetryEvent,
} from './events/event-variants.js';

// ── Session ───────────────────────────────────────────────────────────────────
export type { SessionStatus, RenderSession, TelemetrySnapshot } from './session/session.js';

// ── Transport ─────────────────────────────────────────────────────────────────
export type { TransportEmitFn, TelemetryTransport } from './transport/transport.js';

// ── Replay — identifiers ──────────────────────────────────────────────────────
export type { ReplaySessionId, ReplayFrameId, ReplayBookmarkId } from './replay/replay-ids.js';

// ── Replay — frame ────────────────────────────────────────────────────────────
export type { ReplayFrame } from './replay/replay-frame.js';

// ── Replay — session ──────────────────────────────────────────────────────────
export type {
	ReplaySessionStats,
	ReplayPruningInfo,
	ReplayTimelineEntry,
	ReplaySegment,
	ReplayTimeline,
	ReplaySession,
} from './replay/replay-session.js';

// ── Replay — filter ───────────────────────────────────────────────────────────
export type { ReplayFilter, ReplayFilterResult, ReplayFilterPreset } from './replay/replay-filter.js';

// ── Replay — cursor ───────────────────────────────────────────────────────────
export type { ReplayCursor } from './replay/replay-cursor.js';

// ── Replay — bookmarks ────────────────────────────────────────────────────────
export type {
	ReplayBookmark,
	ReplayBookmarkCreateParams,
	ReplayBookmarkUpdate,
	ReplayBookmarkStore,
} from './replay/replay-bookmark.js';

// ── Replay — navigator ────────────────────────────────────────────────────────
export type { ReplayNavigator } from './replay/replay-navigator.js';

// ── Replay — engine ───────────────────────────────────────────────────────────
export type {
	ReplayBufferSource,
	ReplayEventsSource,
	ReplaySerializedSource,
	ReplaySource,
	ReplayPruningStrategy,
	ReplayEngineOptions,
	ReplayEngine,
	ReplayEngineMap,
} from './replay/replay-engine.js';

// ── Utils ─────────────────────────────────────────────────────────────────────
export { compareSchemaVersions, isSchemaVersionAtLeast } from './utils/compare-versions.js';
export {
	isSchemaVersion,
	isEventType,
	isHealthGrade,
	isFrequencyClass,
	isMemoClassification,
	isSignalKind,
	isRenderTrigger,
	isInferredTrigger,
} from './utils/type-guards.js';
