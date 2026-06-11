import type { SchemaVersion, TelemetryEvent, TelemetrySnapshot, ReplaySession, ReplayFrame, HealthGrade, MemoClassification, FrequencyClass, PropRefType } from '@sapanmozammel/render-core-schema';

// ── Re-export schema types used in public API ──────────────────────────────
export type { HealthGrade, MemoClassification, FrequencyClass, PropRefType };

// ── Sources ────────────────────────────────────────────────────────────────

export type IntelligenceSource =
	| { readonly type: 'snapshot'; readonly snapshot: TelemetrySnapshot }
	| { readonly type: 'events'; readonly events: readonly TelemetryEvent[] }
	| { readonly type: 'replay'; readonly sessions: readonly ReplaySession[] };

export type IntelligenceOptions = {
	readonly maxBottlenecks?: number;
	readonly maxRecommendations?: number;
	readonly confidenceThreshold?: number;
	readonly correlationWindowMs?: number;
	readonly includeWellOptimized?: boolean;
	readonly plugins?: readonly AnalysisPlugin[];
};

// ── Internal normalized form (not exported from index.ts) ─────────────────

export type ComponentSessionData = {
	readonly componentName: string;
	readonly sessionId: string;
	readonly events: readonly TelemetryEvent[];
	readonly frames: readonly ReplayFrame[] | null;
};

// ── Per-component analysis ─────────────────────────────────────────────────

export type ScoreTrend = 'improving' | 'degrading' | 'stable' | 'volatile' | 'insufficient-data';

export type ComponentAnalysis = {
	readonly componentName: string;
	readonly sessionIds: readonly string[];
	readonly totalRenders: number;
	readonly totalSessions: number;
	readonly averageScore: number;
	readonly minScore: number | null;
	readonly maxScore: number | null;
	readonly grade: HealthGrade;
	readonly memoClassification: MemoClassification | null;
	readonly frequencyClass: FrequencyClass | null;
	readonly unstablePropNames: readonly string[];
	readonly unstablePropTypes: readonly PropRefType[];
	readonly uniqueRecommendations: readonly string[];
	readonly scoreTrend: ScoreTrend;
	readonly renderVelocity: number;
	readonly ineffectiveRenderCount: number;
	readonly noChangeRenderCount: number;
};

// ── Application health ─────────────────────────────────────────────────────

export type ApplicationHealth = {
	readonly score: number;
	readonly grade: HealthGrade;
	readonly componentCount: number;
	readonly healthyCount: number;
	readonly degradedCount: number;
	readonly criticalCount: number;
	readonly totalRenders: number;
	readonly analysisSource: 'snapshot' | 'events' | 'replay';
};

// ── Bottlenecks ────────────────────────────────────────────────────────────

export type BottleneckCategory = 'ineffective-memo' | 'reference-instability' | 'high-frequency' | 'score-degradation' | 'parent-cascade' | 'no-change-renders';

export type BottleneckEvidence =
	| { readonly type: 'unstable-prop'; readonly propName: string; readonly refType: PropRefType; readonly occurrenceRate: number }
	| { readonly type: 'memo-defeat'; readonly sessionClass: MemoClassification; readonly ineffectiveRatio: number }
	| { readonly type: 'frequency'; readonly frequencyClass: FrequencyClass; readonly renderVelocity: number }
	| { readonly type: 'render-pattern'; readonly pattern: 'no-change' | 'reference-only'; readonly renderCount: number; readonly ratio: number }
	| { readonly type: 'score-component'; readonly label: string; readonly avgPenalty: number };

export type Bottleneck = {
	readonly rank: number;
	readonly componentName: string;
	readonly category: BottleneckCategory;
	readonly impactScore: number;
	readonly description: string;
	readonly evidence: readonly BottleneckEvidence[];
};

// ── Root causes ────────────────────────────────────────────────────────────

export type RootCauseKind = 'reference-instability' | 'parent-cascade' | 'high-frequency-source' | 'memo-defeat' | 'excessive-renders';

export type RootCause = {
	readonly componentName: string;
	readonly kind: RootCauseKind;
	readonly confidence: number;
	readonly affectedComponents: readonly string[];
	readonly description: string;
	readonly causalChain: readonly string[];
};

// ── Correlations ───────────────────────────────────────────────────────────

export type CorrelationType = 'synchronized-renders' | 'shared-render-spike' | 'probable-cascade';

export type CorrelationEvidence =
	| { readonly type: 'timestamp-proximity'; readonly avgGapMs: number; readonly sampleCount: number }
	| { readonly type: 'simultaneous-spike'; readonly spikeCount: number; readonly windowMs: number }
	| { readonly type: 'render-sequence'; readonly sequenceCount: number; readonly maxGapMs: number };

export type CorrelationGroup = {
	readonly type: CorrelationType;
	readonly components: readonly string[];
	readonly confidence: number;
	readonly description: string;
	readonly evidence: readonly CorrelationEvidence[];
};

// ── Recommendations ────────────────────────────────────────────────────────

export type IntelligenceRecommendationCategory =
	| 'unstable-function'
	| 'unstable-object'
	| 'unstable-array'
	| 'ineffective-memo'
	| 'partially-effective-memo'
	| 'excessive-frequency'
	| 'parent-cascade'
	| 'synchronized-renders'
	| 'render-cascade'
	| 'application-health-critical'
	| 'dominant-bottleneck'
	| 'low-coverage'
	| 'well-optimized'
	| 'score-degradation';

export type RecommendationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type IntelligenceRecommendationEvidence =
	| { readonly type: 'component-analysis'; readonly componentName: string; readonly avgScore: number; readonly grade: HealthGrade }
	| { readonly type: 'unstable-prop'; readonly propName: string; readonly refType: PropRefType; readonly occurrenceRate: number }
	| { readonly type: 'correlation'; readonly components: readonly string[]; readonly confidence: number }
	| { readonly type: 'bottleneck'; readonly rank: number; readonly impactScore: number }
	| { readonly type: 'app-health'; readonly score: number; readonly criticalCount: number; readonly degradedCount: number };

export type IntelligenceRecommendation = {
	readonly id: string;
	readonly componentName: string | null;
	readonly category: IntelligenceRecommendationCategory;
	readonly severity: RecommendationSeverity;
	readonly title: string;
	readonly explanation: string;
	readonly fix: string;
	readonly expectedImpact: string;
	readonly confidence: number;
	readonly affectedComponents: readonly string[];
	readonly evidence: readonly IntelligenceRecommendationEvidence[];
};

// ── Plugin system ──────────────────────────────────────────────────────────

export type AnalysisContext = {
	readonly source: IntelligenceSource;
	readonly components: readonly ComponentAnalysis[];
	readonly health: ApplicationHealth;
	readonly correlations: readonly CorrelationGroup[];
};

export type PluginResult = {
	readonly bottlenecks?: readonly Bottleneck[];
	readonly rootCauses?: readonly RootCause[];
	readonly recommendations?: readonly IntelligenceRecommendation[];
	readonly correlations?: readonly CorrelationGroup[];
};

export type AnalysisPluginDefinition = {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly analyze: (context: AnalysisContext) => PluginResult;
};

export type AnalysisPlugin = AnalysisPluginDefinition;

// ── Intelligence report (primary output) ──────────────────────────────────

export type IntelligenceReport = {
	readonly schemaVersion: SchemaVersion;
	readonly generatedAt: number;
	readonly applicationHealth: ApplicationHealth;
	readonly components: readonly ComponentAnalysis[];
	readonly bottlenecks: readonly Bottleneck[];
	readonly rootCauses: readonly RootCause[];
	readonly correlations: readonly CorrelationGroup[];
	readonly recommendations: readonly IntelligenceRecommendation[];
};

// ── Error codes ────────────────────────────────────────────────────────────

export type IntelligenceErrorCode = 'EMPTY_SOURCE' | 'INVALID_SOURCE' | 'PLUGIN_ERROR';
