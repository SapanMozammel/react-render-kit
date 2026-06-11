import type { ReactNode } from 'react';
import type {
	TelemetryTransport,
	TelemetryBuffer,
	TelemetrySession,
	TelemetryBufferSnapshot,
	TelemetryEvent,
} from '@sapanmozammel/render-telemetry-core';
import type {
	ReplaySource,
	ReplaySession,
	ReplayEngine,
	ReplayEngineOptions,
	ReplayPruningStrategy,
} from '@sapanmozammel/render-replay-engine';
import type {
	IntelligenceSource,
	IntelligenceOptions,
	IntelligenceReport,
	AnalysisPlugin,
} from '@sapanmozammel/render-intelligence';

// ── Error ─────────────────────────────────────────────────────────────────────

export type RenderKitErrorCode =
	| 'INIT_FAILED'
	| 'TELEMETRY_FAILED'
	| 'REPLAY_FAILED'
	| 'ANALYSIS_FAILED'
	| 'PLUGIN_FAILED'
	| 'CONTEXT_MISSING'
	| 'DISABLED'
	| 'INVALID_CONFIG';

// ── Config ────────────────────────────────────────────────────────────────────

export type RenderKitTelemetryConfig = {
	enabled?: boolean;
	maxEvents?: number;
	transports?: readonly TelemetryTransport[];
};

export type RenderKitReplayConfig = {
	enabled?: boolean;
	maxFrames?: number;
	pruningStrategy?: ReplayPruningStrategy;
};

export type RenderKitIntelligenceConfig = {
	enabled?: boolean;
	maxBottlenecks?: number;
	maxRecommendations?: number;
	confidenceThreshold?: number;
	correlationWindowMs?: number;
	includeWellOptimized?: boolean;
	plugins?: readonly AnalysisPlugin[];
};

export type RenderKitPlugin = {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	onInit?: (kit: RenderKit) => void;
	onDestroy?: (kit: RenderKit) => void;
	analysisPlugin?: AnalysisPlugin;
};

export type RenderKitConfig = {
	enabled?: boolean;
	telemetry?: RenderKitTelemetryConfig;
	replay?: RenderKitReplayConfig;
	intelligence?: RenderKitIntelligenceConfig;
	plugins?: readonly RenderKitPlugin[];
};

// ResolvedRenderKitConfig — all optionals filled with validated defaults; immutable
export type ResolvedRenderKitConfig = {
	readonly enabled: boolean;
	readonly telemetry: {
		readonly enabled: boolean;
		readonly maxEvents: number;
		readonly transports: readonly TelemetryTransport[];
	};
	readonly replay: {
		readonly enabled: boolean;
		readonly maxFrames: number;
		readonly pruningStrategy: ReplayPruningStrategy;
	};
	readonly intelligence: {
		readonly enabled: boolean;
		readonly maxBottlenecks: number;
		readonly maxRecommendations: number;
		readonly confidenceThreshold: number;
		readonly correlationWindowMs: number;
		readonly includeWellOptimized: boolean;
		readonly plugins: readonly AnalysisPlugin[];
	};
	readonly plugins: readonly RenderKitPlugin[];
};

// ── Subsystem Types ───────────────────────────────────────────────────────────

export type RenderKitTelemetry = {
	readonly enabled: boolean;
	readonly buffer: TelemetryBuffer;
	readonly createSession: (componentName: string) => TelemetrySession;
	readonly endSession: (session: TelemetrySession) => TelemetrySession;
	readonly registerTransport: (transport: TelemetryTransport) => () => void;
	readonly unregisterAllTransports: () => void;
	readonly snapshot: () => TelemetryBufferSnapshot;
	readonly serialize: () => string;
	readonly clear: () => void;
};

export type RenderKitReplay = {
	readonly enabled: boolean;
	readonly fromBuffer: (options?: ReplayEngineOptions) => readonly ReplaySession[];
	readonly fromEvents: (events: readonly TelemetryEvent[], options?: ReplayEngineOptions) => readonly ReplaySession[];
	readonly fromSerialized: (json: string, options?: ReplayEngineOptions) => readonly ReplaySession[];
	readonly engine: (source: ReplaySource, sessionId?: string, options?: ReplayEngineOptions) => ReplayEngine;
};

// ── Kit Instance ──────────────────────────────────────────────────────────────

export type RenderKit = {
	readonly config: ResolvedRenderKitConfig;
	readonly enabled: boolean;
	readonly telemetry: RenderKitTelemetry;
	readonly replay: RenderKitReplay;
	readonly analyze: (source?: IntelligenceSource, options?: Partial<IntelligenceOptions>) => IntelligenceReport;
	readonly destroy: () => void;
};

// ── React Context ─────────────────────────────────────────────────────────────

export type RenderKitProviderProps = {
	kit: RenderKit;
	children: ReactNode;
};
