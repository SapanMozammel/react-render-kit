import type { InsightReport, RenderInsightsOptions } from '@sapanmozammel/render-insights';
import type React from 'react';

// ── Store ─────────────────────────────────────────────────────────────────

export type PlaygroundStore = {
	subscribe: (listener: () => void) => () => void;
	getSnapshot: () => readonly InsightReport[];
	getServerSnapshot: () => readonly InsightReport[];
	push: (report: InsightReport) => void;
	clear: () => void;
};

// ── Options ───────────────────────────────────────────────────────────────

export type RenderPlaygroundOptions = RenderInsightsOptions;

export type CaptureOptions = {
	maxEntries?: number;
};

// ── Component Props ────────────────────────────────────────────────────────

export type PlaygroundProviderProps = {
	children: React.ReactNode;
	maxEntries?: number;
	store?: PlaygroundStore;
};

export type RenderPlaygroundPanelProps = {
	className?: string;
	maxVisible?: number;
	onClear?: () => void;
};

// ── Recommendation Engine ─────────────────────────────────────────────────

export type RecommendationCategory =
	| 'unstable-function'
	| 'unstable-object'
	| 'unstable-array'
	| 'ineffective-memo'
	| 'partially-effective-memo'
	| 'excessive-frequency'
	| 'parent-triggered'
	| 'over-memoization'
	| 'score-degrading'
	| 'well-optimized';

export type RecommendationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type RecommendationEvidence =
	| { type: 'unstable-prop'; propName: string; refType: 'function' | 'object' | 'array'; occurrences: number }
	| { type: 'render-pattern'; pattern: 'all-reference-only' | 'all-no-change' | 'mixed'; renderCount: number }
	| { type: 'frequency-measurement'; ratePerSecond: number; classification: string; windowMs: number }
	| { type: 'memo-session'; sessionClass: string; genuineCount: number; referenceOnlyCount: number; mixedCount: number }
	| { type: 'score-component'; label: string; penalty: number };

export type Recommendation = {
	id: string;
	category: RecommendationCategory;
	severity: RecommendationSeverity;
	title: string;
	explanation: string;
	fix: string;
	expectedImpact: string;
	confidence: number;
	evidence: RecommendationEvidence[];
};

// ── Score Explainability ──────────────────────────────────────────────────

export type ScoreComponent = {
	label: string;
	penalty: number;
	explanation: string;
};

export type ScoreBreakdown = {
	total: number;
	frequencyPenalty: number;
	instabilityPenalty: number;
	memoPenalty: number;
	mixedSignalPenalty: number;
	components: ScoreComponent[];
};

// ── Session Intelligence ──────────────────────────────────────────────────

export type ScoreTrend = 'improving' | 'degrading' | 'stable';

export type SessionStats = {
	windowSize: number;
	mostFrequentTrigger: string;
	mostUnstableProp: string | null;
	mostUnstablePropOccurrences: number;
	scoreTrend: ScoreTrend;
	memoTrend: ScoreTrend;
	averageScore: number;
	worstScore: number;
	bestScore: number;
};
