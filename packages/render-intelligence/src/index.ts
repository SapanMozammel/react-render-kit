// ── Primary API ───────────────────────────────────────────────────────────
export { analyzeRenders, analyzeComponents, rankBottlenecks } from './pipeline/pipeline.js';

// ── Plugin API ────────────────────────────────────────────────────────────
export { createPlugin } from './plugins/plugin-registry.js';

// ── Error ─────────────────────────────────────────────────────────────────
export { IntelligenceError, createIntelligenceError } from './errors/intelligence-error.js';

// ── Types ─────────────────────────────────────────────────────────────────
export type {
	// Sources
	IntelligenceSource,
	IntelligenceOptions,

	// Report
	IntelligenceReport,

	// Health
	ApplicationHealth,

	// Components
	ComponentAnalysis,
	ScoreTrend,

	// Bottlenecks
	Bottleneck,
	BottleneckCategory,
	BottleneckEvidence,

	// Root causes
	RootCause,
	RootCauseKind,

	// Correlations
	CorrelationGroup,
	CorrelationType,
	CorrelationEvidence,

	// Recommendations
	IntelligenceRecommendation,
	IntelligenceRecommendationCategory,
	IntelligenceRecommendationEvidence,
	RecommendationSeverity,

	// Plugins
	AnalysisPlugin,
	AnalysisPluginDefinition,
	AnalysisContext,
	PluginResult,

	// Error codes
	IntelligenceErrorCode,

	// Re-exported schema types
	HealthGrade,
	MemoClassification,
	FrequencyClass,
	PropRefType,
} from './types/index.js';
