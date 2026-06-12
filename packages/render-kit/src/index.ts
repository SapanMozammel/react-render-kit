// ── SDK Core (Tier 1) ──────────────────────────────────────────────────────
export { createRenderKit } from './factory/kit-factory.js';
export { RenderKitProvider, useRenderKit } from './context/kit-context.js';
export { RenderKitError, createRenderKitError } from './errors/kit-error.js';
export type {
	RenderKitConfig,
	RenderKitTelemetryConfig,
	RenderKitReplayConfig,
	RenderKitIntelligenceConfig,
	RenderKitPlugin,
	ResolvedRenderKitConfig,
	RenderKit,
	RenderKitTelemetry,
	RenderKitReplay,
	RenderKitProviderProps,
	RenderKitErrorCode,
} from './types/index.js';

// ── Ecosystem Re-exports (Tier 2 — Locked Manifest) ───────────────────────
// why-render
export { useWhyRender } from '@sapanmozammel/why-render';
export type { WhyRenderOptions } from '@sapanmozammel/why-render';

// why-render-frequency
export { useRenderFrequency } from '@sapanmozammel/why-render-frequency';
export type { RenderFrequencyOptions } from '@sapanmozammel/why-render-frequency';

// render-trace
export { useTraceRender, createRenderTrace } from '@sapanmozammel/render-trace';
export type { LogMode, RenderCycle, RenderNode, RenderTraceOptions, TraceInstance, TraceRenderOptions } from '@sapanmozammel/render-trace';

// unstable-props-detector
export { useUnstablePropsDetector } from '@sapanmozammel/unstable-props-detector';
export type { PropInstability, PropType, UnstablePropsOptions } from '@sapanmozammel/unstable-props-detector';

// memo-effect-analyzer
export { useMemoEffectAnalyzer } from '@sapanmozammel/memo-effect-analyzer';
export type { MemoClassification, MemoEffectOptions, RenderSignal, SignalKind } from '@sapanmozammel/memo-effect-analyzer';

// render-insights
export { useRenderInsights } from '@sapanmozammel/render-insights';
export type { FrequencyClass, HealthGrade, InferredTrigger, InsightReport, RenderInsightsOptions } from '@sapanmozammel/render-insights';

// render-playground
export { useRenderPlayground, useInsightCapture, PlaygroundProvider, usePlaygroundStore, createPlaygroundStore, RenderPlaygroundPanel } from '@sapanmozammel/render-playground';
export type {
	PlaygroundStore,
	RenderPlaygroundOptions,
	CaptureOptions,
	PlaygroundProviderProps,
	RenderPlaygroundPanelProps,
	RecommendationCategory,
	RecommendationSeverity,
	Recommendation,
	ScoreBreakdown,
	ScoreTrend,
	SessionStats,
} from '@sapanmozammel/render-playground';

// render-telemetry-core
export {
	createTelemetryBuffer,
	createTelemetrySession,
	endTelemetrySession,
	createMemoryTransport,
	createLocalStorageTransport,
	createCustomTransport,
	registerTransport,
	unregisterAllTransports,
	emitEvents,
	createSessionStartEvent,
	createSessionEndEvent,
	serializeBuffer,
	deserializeBuffer,
	serializeSession,
	deserializeSession,
	validateEvent,
	isKnownEventType,
	CURRENT_SCHEMA_VERSION,
	EVENT_SCHEMA_VERSIONS,
	createRenderEvent,
	createPropChangeEvent,
	createFrequencyEvent,
	createScoreEvent,
	createRecommendationEvent,
} from '@sapanmozammel/render-telemetry-core';
export type {
	SchemaVersion,
	TelemetryEventType,
	TelemetryEventBase,
	RenderEvent,
	PropChangeEvent,
	FrequencyEvent,
	ScoreEvent,
	RecommendationEvent,
	SessionEndEvent,
	TelemetryEvent,
	TelemetrySession,
	TelemetryBufferSnapshot,
	TelemetryBuffer,
	TelemetryBufferOptions,
	TelemetryTransport,
	TransportEmitFn,
	MemoryTransport,
} from '@sapanmozammel/render-telemetry-core';

// render-replay-engine
export { createReplayEngine, buildReplaySessions, fromEvents, fromBuffer, fromSerialized, applyFilter, mergeFilters, withFilter, applyPreset, createBookmarkStore, ReplayError } from '@sapanmozammel/render-replay-engine';
export type {
	ReplaySessionId,
	ReplayFrameId,
	ReplayFrame,
	ReplaySession,
	ReplaySessionStats,
	ReplayCursor,
	ReplayFilter,
	ReplayFilterResult,
	ReplayFilterPreset,
	ReplayBookmark,
	ReplayBookmarkStore,
	ReplayNavigator,
	ReplayEngine,
	ReplayEngineOptions,
	ReplayPruningStrategy,
	ReplaySource,
	ReplayErrorCode,
} from '@sapanmozammel/render-replay-engine';

// render-intelligence
export { analyzeRenders, analyzeComponents, rankBottlenecks, createPlugin, IntelligenceError } from '@sapanmozammel/render-intelligence';
export type {
	IntelligenceSource,
	IntelligenceOptions,
	IntelligenceReport,
	ApplicationHealth,
	ComponentAnalysis,
	Bottleneck,
	BottleneckCategory,
	RootCause,
	RootCauseKind,
	CorrelationGroup,
	CorrelationType,
	IntelligenceRecommendation,
	AnalysisPlugin,
	AnalysisContext,
	PluginResult,
	IntelligenceErrorCode,
} from '@sapanmozammel/render-intelligence';
