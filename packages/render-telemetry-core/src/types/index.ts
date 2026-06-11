// ── Schema Versioning ────────────────────────────────────────────────────────

export type SchemaVersion = `${number}.${number}.${number}`;

// ── Event Types ──────────────────────────────────────────────────────────────

export type TelemetryEventType = 'session-start' | 'render' | 'prop-change' | 'frequency' | 'score' | 'recommendation' | 'session-end';

// ── Domain Value Types ────────────────────────────────────────────────────────
// Self-contained — intentionally NOT imported from @sapanmozammel/render-insights
// to prevent circular dependencies as the ecosystem matures.

export type TelemetryPropChangeKind = 'value-changed' | 'reference-changed' | 'added' | 'removed';
export type TelemetryPropRefType = 'function' | 'array' | 'object';

// Maps from render-insights InferredTrigger:
//   'no-prop-change'         → 'parent'   (parent re-render, no prop changes)
//   'genuine-prop-change'    → 'props'
//   'reference-instability'  → 'props'
//   'mixed'                  → 'props'
// 'state' and 'context' are reserved for future use by other consumers.
export type TelemetryRenderTrigger = 'props' | 'state' | 'context' | 'parent' | 'unknown';

export type TelemetryInferredTrigger = 'no-prop-change' | 'genuine-prop-change' | 'reference-instability' | 'mixed';

export type TelemetryFrequencyClass = 'LOW' | 'MODERATE' | 'HIGH' | 'NOT_ENOUGH_DATA';
export type TelemetryHealthGrade = 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | 'CRITICAL';
export type TelemetryMemoClassification = 'NOT_APPLICABLE' | 'EFFECTIVE' | 'INEFFECTIVE' | 'PARTIALLY_EFFECTIVE';
export type TelemetrySignalKind = 'genuine' | 'reference-only' | 'mixed';

export type TelemetryPropChangeEntry =
	| { kind: 'value-changed'; key: string; prev: unknown; next: unknown }
	| { kind: 'reference-changed'; key: string; refType: TelemetryPropRefType }
	| { kind: 'added'; key: string; next: unknown }
	| { kind: 'removed'; key: string; prev: unknown };

export type TelemetryPropInstability = {
	name: string;
	type: TelemetryPropRefType;
};

// ── Base Event ────────────────────────────────────────────────────────────────

export type TelemetryEventBase = {
	readonly id: string;
	readonly type: TelemetryEventType;
	readonly schemaVersion: SchemaVersion;
	readonly sessionId: string;
	readonly componentName: string;
	readonly sequenceNumber: number; // monotonic within a session
	readonly timestamp: number; // performance.now() — high precision, relative to navigation start
	readonly wallTimestamp: number; // Date.now() — absolute calendar time (ms since epoch)
};

// ── Event Variants ────────────────────────────────────────────────────────────

export type SessionStartEvent = TelemetryEventBase & {
	readonly type: 'session-start';
};

export type RenderEvent = TelemetryEventBase & {
	readonly type: 'render';
	readonly renderNumber: number;
	readonly triggeredBy: TelemetryRenderTrigger;
};

export type PropChangeEvent = TelemetryEventBase & {
	readonly type: 'prop-change';
	readonly renderNumber: number;
	readonly changed: readonly TelemetryPropChangeEntry[];
	readonly unstable: readonly TelemetryPropInstability[];
	readonly inferredTrigger: TelemetryInferredTrigger;
	readonly signalKind: TelemetrySignalKind; // per-render memo effectiveness signal
};

export type FrequencyEvent = TelemetryEventBase & {
	readonly type: 'frequency';
	readonly renderNumber: number;
	readonly windowMs: number;
	readonly windowCount: number;
	readonly rate: number;
	readonly classification: TelemetryFrequencyClass;
	readonly totalRenders: number;
};

export type ScoreEvent = TelemetryEventBase & {
	readonly type: 'score';
	readonly renderNumber: number;
	readonly score: number;
	readonly grade: TelemetryHealthGrade;
	readonly frequencyPenalty: number;
	readonly instabilityPenalty: number;
	readonly memoPenalty: number;
	readonly mixedSignalPenalty: number;
	readonly memoClassification: TelemetryMemoClassification; // session-level memo effectiveness
	readonly signalKind: TelemetrySignalKind | null; // this render's signal (null = no prop change)
};

export type RecommendationEvent = TelemetryEventBase & {
	readonly type: 'recommendation';
	readonly renderNumber: number;
	readonly recommendations: readonly string[];
};

export type SessionEndEvent = TelemetryEventBase & {
	readonly type: 'session-end';
	readonly totalRenders: number;
	readonly durationMs: number;
	readonly finalScore: number | null;
};

export type TelemetryEvent = SessionStartEvent | RenderEvent | PropChangeEvent | FrequencyEvent | ScoreEvent | RecommendationEvent | SessionEndEvent;

// ── Session ───────────────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'ended';

export type TelemetrySession = {
	readonly id: string;
	readonly componentName: string;
	readonly startTimestamp: number; // performance.now() at mount
	readonly startWallTimestamp: number; // Date.now() at mount
	readonly endTimestamp: number | null; // performance.now() at unmount (null if still active)
	readonly endWallTimestamp: number | null;
	readonly status: SessionStatus;
	readonly sequenceCounter: number; // incremented by each event factory; readonly externally
};

// ── Buffer ────────────────────────────────────────────────────────────────────

export type TelemetryBufferOptions = {
	maxEvents?: number; // default: 1000; clamped to min 1
};

export type TelemetryBufferSnapshot = {
	readonly events: readonly TelemetryEvent[];
	readonly sessions: Readonly<Record<string, TelemetrySession>>;
};

export type TelemetryBuffer = {
	// useSyncExternalStore interface (React-compatible without importing React)
	subscribe: (listener: () => void) => () => void;
	getSnapshot: () => TelemetryBufferSnapshot;
	getServerSnapshot: () => TelemetryBufferSnapshot; // always returns SERVER_SNAPSHOT

	// Mutations — each replaces snapshot and notifies all listeners
	push: (event: TelemetryEvent) => void;
	pushSession: (session: TelemetrySession) => void;
	updateSession: (session: TelemetrySession) => void; // upsert by session.id
	clear: () => void; // resets to SERVER_SNAPSHOT

	// Queries — O(n) on current snapshot; safe to call inside useSyncExternalStore
	getEventsBySession: (sessionId: string) => readonly TelemetryEvent[];
	getEventsByComponent: (componentName: string) => readonly TelemetryEvent[];
	getEventsByType: <T extends TelemetryEventType>(type: T) => readonly Extract<TelemetryEvent, { type: T }>[];
	getSession: (sessionId: string) => TelemetrySession | undefined;
	getSessionsByComponent: (componentName: string) => readonly TelemetrySession[];
};

// ── Transport ─────────────────────────────────────────────────────────────────

export type TransportEmitFn = (events: ReadonlyArray<TelemetryEvent>) => void;

export type TelemetryTransport = {
	name: string;
	emit: TransportEmitFn;
	flush?: () => void; // called before page unload; for network transports (future)
	dispose?: () => void; // cleanup on teardown
};

// MemoryTransport is a TelemetryTransport with extra inspection methods
export type MemoryTransport = TelemetryTransport & {
	getEmitted: () => readonly TelemetryEvent[];
	clearEmitted: () => void;
};

// ── Event Factory Input Types ─────────────────────────────────────────────────

export type RenderEventData = {
	renderNumber: number;
	triggeredBy?: TelemetryRenderTrigger; // defaults to 'unknown' if omitted
};

export type PropChangeEventData = {
	renderNumber: number;
	changed: readonly TelemetryPropChangeEntry[];
	unstable: readonly TelemetryPropInstability[];
	inferredTrigger: TelemetryInferredTrigger;
	signalKind: TelemetrySignalKind;
};

export type FrequencyEventData = {
	renderNumber: number;
	windowMs: number;
	windowCount: number;
	rate: number;
	classification: TelemetryFrequencyClass;
	totalRenders: number;
};

export type ScoreEventData = {
	renderNumber: number;
	score: number;
	grade: TelemetryHealthGrade;
	frequencyPenalty: number;
	instabilityPenalty: number;
	memoPenalty: number;
	mixedSignalPenalty: number;
	memoClassification: TelemetryMemoClassification;
	signalKind: TelemetrySignalKind | null;
};

export type RecommendationEventData = {
	renderNumber: number;
	recommendations: readonly string[];
};

export type SessionEndEventData = {
	totalRenders: number;
	finalScore?: number | null; // defaults to null if omitted
};

// ── Transport Options ─────────────────────────────────────────────────────────

export type LocalStorageTransportOptions = {
	maxBytes?: number; // default: 2_000_000 (2MB)
	onExceed?: 'prune' | 'clear' | 'skip'; // default: 'prune' (remove oldest events first)
};
