import type { EventBase } from './event-base.js';
import type { RenderTrigger, InferredTrigger } from '../lifecycle/render-lifecycle.js';
import type { PropChangeEntry, PropInstability } from '../props/prop-diff.js';
import type { FrequencyClass } from '../analysis/frequency.js';
import type { SignalKind, MemoClassification } from '../analysis/memo.js';
import type { HealthGrade } from '../analysis/scoring.js';

export type SessionStartEvent = EventBase & {
	readonly type: 'session-start';
};

export type RenderEvent = EventBase & {
	readonly type: 'render';
	readonly renderNumber: number;
	readonly triggeredBy: RenderTrigger;
};

export type PropChangeEvent = EventBase & {
	readonly type: 'prop-change';
	readonly renderNumber: number;
	readonly changed: readonly PropChangeEntry[];
	readonly unstable: readonly PropInstability[];
	readonly inferredTrigger: InferredTrigger;
	readonly signalKind: SignalKind;
};

export type FrequencyEvent = EventBase & {
	readonly type: 'frequency';
	readonly renderNumber: number;
	readonly windowMs: number;
	readonly windowCount: number;
	readonly rate: number;
	readonly classification: FrequencyClass;
	readonly totalRenders: number;
};

export type ScoreEvent = EventBase & {
	readonly type: 'score';
	readonly renderNumber: number;
	readonly score: number;
	readonly grade: HealthGrade;
	readonly frequencyPenalty: number;
	readonly instabilityPenalty: number;
	readonly memoPenalty: number;
	readonly mixedSignalPenalty: number;
	readonly memoClassification: MemoClassification;
	readonly signalKind: SignalKind | null;
};

export type RecommendationEvent = EventBase & {
	readonly type: 'recommendation';
	readonly renderNumber: number;
	readonly recommendations: readonly string[];
};

export type SessionEndEvent = EventBase & {
	readonly type: 'session-end';
	readonly totalRenders: number;
	readonly durationMs: number;
	readonly finalScore: number | null;
};

export type TelemetryEvent = SessionStartEvent | RenderEvent | PropChangeEvent | FrequencyEvent | ScoreEvent | RecommendationEvent | SessionEndEvent;
