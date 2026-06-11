import type {
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
} from '@sapanmozammel/render-telemetry-core';

// ── Re-export telemetry types needed by consumers ─────────────────────────────
export type {
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
};

// ── Identifier brands ─────────────────────────────────────────────────────────

export type ReplaySessionId = string;
export type ReplayFrameId = string; // `${sessionId}:${frameIndex}`
export type ReplayBookmarkId = string;

// ── ReplayFrame ───────────────────────────────────────────────────────────────

export type ReplayFrame = {
	readonly id: ReplayFrameId;
	readonly frameIndex: number;
	readonly renderNumber: number;
	readonly sessionId: ReplaySessionId;
	readonly componentName: string;
	readonly wallTimestamp: number;
	readonly relativeMs: number;

	readonly renderEvent: RenderEvent;
	readonly propChangeEvent: PropChangeEvent | null;
	readonly frequencyEvent: FrequencyEvent | null;
	readonly scoreEvent: ScoreEvent | null;
	readonly recommendationEvent: RecommendationEvent | null;

	readonly score: number | null;
	readonly grade: TelemetryHealthGrade | null;
	readonly memoClassification: TelemetryMemoClassification | null;
	readonly frequencyClass: TelemetryFrequencyClass | null;
	readonly signalKind: TelemetrySignalKind | null;
	readonly hasUnstableProps: boolean;
	readonly unstablePropCount: number;
	readonly changedPropCount: number;
	readonly recommendationCount: number;
	readonly triggeredBy: 'parent' | 'props';
};

// ── ReplaySessionStats ────────────────────────────────────────────────────────

export type ReplaySessionStats = {
	readonly totalRenders: number;
	readonly averageScore: number | null;
	readonly minScore: number | null;
	readonly maxScore: number | null;
	readonly initialScore: number | null;
	readonly finalScore: number | null;
	readonly scoreDelta: number | null;
	readonly ineffectiveRenderCount: number;
	readonly highFrequencyCount: number;
	readonly unstablePropNames: readonly string[];
	readonly totalRecommendations: number;
	readonly uniqueRecommendations: readonly string[];
};

// ── ReplayPruningInfo ─────────────────────────────────────────────────────────

export type ReplayPruningInfo =
	| {
			readonly pruned: true;
			readonly originalFrameCount: number;
			readonly prunedFrameCount: number;
			readonly strategy: 'fifo' | 'score-weighted';
	  }
	| {
			readonly pruned: false;
	  };

// ── ReplayTimeline ────────────────────────────────────────────────────────────

export type ReplayTimelineEntry = {
	readonly frameIndex: number;
	readonly renderNumber: number;
	readonly wallTimestamp: number;
	readonly relativeMs: number;
	readonly score: number | null;
	readonly grade: TelemetryHealthGrade | null;
	readonly severity: 'ok' | 'warn' | 'critical';
	readonly hasUnstableProps: boolean;
	readonly signalKind: TelemetrySignalKind | null;
};

export type ReplaySegment = {
	readonly label: string;
	readonly startFrameIndex: number;
	readonly endFrameIndex: number;
	readonly trend: 'improving' | 'degrading' | 'stable' | 'volatile';
	readonly avgScore: number | null;
};

export type ReplayTimeline = {
	readonly sessionId: ReplaySessionId;
	readonly entries: readonly ReplayTimelineEntry[];
	readonly duration: number | null;
	readonly segments: readonly ReplaySegment[];
};

// ── ReplaySession ─────────────────────────────────────────────────────────────

export type ReplaySession = {
	readonly id: ReplaySessionId;
	readonly componentName: string;
	readonly startedAt: number;
	readonly endedAt: number | null;
	readonly durationMs: number | null;
	readonly schemaVersion: string;

	readonly frames: readonly ReplayFrame[];
	readonly frameCount: number;

	readonly timeline: ReplayTimeline;
	readonly stats: ReplaySessionStats;
	readonly pruningInfo: ReplayPruningInfo;
};

// ── ReplayCursor ──────────────────────────────────────────────────────────────

export type ReplayCursor = {
	readonly sessionId: ReplaySessionId;
	readonly frameIndex: number;
	readonly totalFrames: number;
	readonly isAtStart: boolean;
	readonly isAtEnd: boolean;
	readonly canGoPrevious: boolean;
	readonly canGoNext: boolean;
	readonly frame: ReplayFrame;
};

// ── ReplayFilter ──────────────────────────────────────────────────────────────

export type ReplayFilter = {
	readonly componentNames?: readonly string[];
	readonly minScore?: number;
	readonly maxScore?: number;
	readonly grades?: readonly TelemetryHealthGrade[];
	readonly memoClassifications?: readonly TelemetryMemoClassification[];
	readonly frequencyClasses?: readonly TelemetryFrequencyClass[];
	readonly signalKinds?: readonly TelemetrySignalKind[];
	readonly hasUnstablePropsOnly?: boolean;
	readonly hasRecommendationsOnly?: boolean;
	readonly triggeredBy?: readonly ('parent' | 'props')[];
	readonly frameIndexRange?: readonly [number, number];
	readonly timestampRange?: readonly [number, number];
	readonly relativeMsRange?: readonly [number, number];
};

export type ReplayFilterResult = {
	readonly filter: ReplayFilter;
	readonly matchingFrameIndices: readonly number[];
	readonly matchingFrameCount: number;
	readonly totalFrameCount: number;
};

export type ReplayFilterPreset = 'issues-only' | 'score-degradation' | 'reference-instability' | 'high-frequency' | 'ineffective-memo' | 'prop-changes-only' | 'parent-triggered-only';

// ── Bookmarks ─────────────────────────────────────────────────────────────────

export type ReplayBookmark = {
	readonly id: ReplayBookmarkId;
	readonly sessionId: ReplaySessionId;
	readonly frameIndex: number;
	readonly label: string;
	readonly note: string | null;
	readonly createdAt: number;
	readonly tags: readonly string[];
};

export type ReplayBookmarkCreateParams = {
	readonly sessionId: ReplaySessionId;
	readonly frameIndex: number;
	readonly label: string;
	readonly note?: string;
	readonly tags?: readonly string[];
};

export type ReplayBookmarkUpdate = {
	readonly label?: string;
	readonly note?: string | null;
	readonly tags?: readonly string[];
};

export type ReplayBookmarkStore = {
	getAll: () => readonly ReplayBookmark[];
	getForSession: (sessionId: ReplaySessionId) => readonly ReplayBookmark[];
	getForFrame: (sessionId: ReplaySessionId, frameIndex: number) => readonly ReplayBookmark[];
	create: (params: ReplayBookmarkCreateParams) => ReplayBookmark;
	remove: (bookmarkId: ReplayBookmarkId) => void;
	update: (bookmarkId: ReplayBookmarkId, updates: ReplayBookmarkUpdate) => ReplayBookmark | null;
	exportBookmarks: () => readonly ReplayBookmark[];
	importBookmarks: (bookmarks: readonly ReplayBookmark[]) => void;
};

// ── Navigator ─────────────────────────────────────────────────────────────────

export type ReplayNavigator = {
	atStart: () => ReplayCursor;
	atEnd: () => ReplayCursor;
	at: (frameIndex: number) => ReplayCursor | null;
	next: (cursor: ReplayCursor) => ReplayCursor | null;
	previous: (cursor: ReplayCursor) => ReplayCursor | null;
	seek: (cursor: ReplayCursor, frameIndex: number) => ReplayCursor | null;
	jumpToRender: (cursor: ReplayCursor, renderNumber: number) => ReplayCursor | null;
	jumpToTimestamp: (cursor: ReplayCursor, relativeMs: number) => ReplayCursor;
	nextMatching: (cursor: ReplayCursor, filter: ReplayFilter) => ReplayCursor | null;
	previousMatching: (cursor: ReplayCursor, filter: ReplayFilter) => ReplayCursor | null;
	jumpToBookmark: (bookmarkId: ReplayBookmarkId) => ReplayCursor | null;
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

// ── Source ────────────────────────────────────────────────────────────────────

export type ReplayBufferSource = {
	readonly type: 'buffer';
	readonly buffer: TelemetryBuffer;
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

// ── Options ───────────────────────────────────────────────────────────────────

export type ReplayPruningStrategy = 'fifo' | 'score-weighted';

export type ReplayEngineOptions = {
	readonly maxFrames?: number;
	readonly pruningStrategy?: ReplayPruningStrategy;
	readonly segmentWindowSize?: number;
	readonly enableStats?: boolean;
	readonly enableTimeline?: boolean;
	readonly enableSegments?: boolean;
};

// ── Error ─────────────────────────────────────────────────────────────────────

export type ReplayErrorCode = 'EMPTY_SOURCE' | 'MULTIPLE_SESSIONS' | 'SESSION_NOT_FOUND' | 'INVALID_SERIALIZED_JSON' | 'SCHEMA_VERSION_MISMATCH' | 'NO_RENDER_EVENTS';
