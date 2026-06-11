import type { HealthGrade } from '../analysis/scoring.js';
import type { MemoClassification, SignalKind } from '../analysis/memo.js';
import type { FrequencyClass } from '../analysis/frequency.js';

export type ReplayFilter = {
	readonly componentNames?: readonly string[];
	readonly minScore?: number;
	readonly maxScore?: number;
	readonly grades?: readonly HealthGrade[];
	readonly memoClassifications?: readonly MemoClassification[];
	readonly frequencyClasses?: readonly FrequencyClass[];
	readonly signalKinds?: readonly SignalKind[];
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
