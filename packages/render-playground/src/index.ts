// Context & Provider
export { PlaygroundContext, PlaygroundProvider, usePlaygroundStore } from './context/playground-context.js';

// Store factory
export { createPlaygroundStore } from './store/playground-store.js';

// Hooks
export { useRenderPlayground } from './hooks/use-render-playground.js';
export { useInsightCapture } from './hooks/use-insight-capture.js';

// Panel component
export { RenderPlaygroundPanel } from './components/render-playground-panel.js';

// Engine — exposed for external tooling / testing
export { computeRecommendations } from './engine/recommendation-engine.js';
export { computeScoreBreakdown } from './engine/score-breakdown.js';
export { computeSessionStats } from './engine/session-stats.js';

// Types
export type {
	PlaygroundStore,
	RenderPlaygroundOptions,
	CaptureOptions,
	PlaygroundProviderProps,
	RenderPlaygroundPanelProps,
	RecommendationCategory,
	RecommendationSeverity,
	RecommendationEvidence,
	Recommendation,
	ScoreComponent,
	ScoreBreakdown,
	ScoreTrend,
	SessionStats,
} from './types/index.js';

// Re-export InsightReport so consumers don't need the peer dep for type-only usage
export type { InsightReport } from '@sapanmozammel/render-insights';
