import type { ReplaySessionId, ReplayFrameId } from './replay-ids.js';
import type { RenderEvent, PropChangeEvent, FrequencyEvent, ScoreEvent, RecommendationEvent } from '../events/event-variants.js';
import type { HealthGrade } from '../analysis/scoring.js';
import type { MemoClassification, SignalKind } from '../analysis/memo.js';
import type { FrequencyClass } from '../analysis/frequency.js';

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
	readonly grade: HealthGrade | null;
	readonly memoClassification: MemoClassification | null;
	readonly frequencyClass: FrequencyClass | null;
	readonly signalKind: SignalKind | null;
	readonly hasUnstableProps: boolean;
	readonly unstablePropCount: number;
	readonly changedPropCount: number;
	readonly recommendationCount: number;
	readonly triggeredBy: 'parent' | 'props';
};
