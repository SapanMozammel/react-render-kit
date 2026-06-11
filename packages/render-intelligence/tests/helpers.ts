import type {
	TelemetryEvent,
	RenderEvent,
	ScoreEvent,
	PropChangeEvent,
	FrequencyEvent,
	RecommendationEvent,
	SessionStartEvent,
	SessionEndEvent,
	MemoClassification,
	FrequencyClass,
	HealthGrade,
	SignalKind,
} from '@sapanmozammel/render-core-schema';
import type { ComponentSessionData, ComponentAnalysis } from '../src/types/index.js';

let seq = 0;
const nextSeq = () => ++seq;

export const resetSeq = () => {
	seq = 0;
};

export const makeRenderEvent = (
	opts: {
		sessionId?: string;
		componentName?: string;
		renderNumber?: number;
		wallTimestamp?: number;
		triggeredBy?: 'props' | 'state' | 'context' | 'parent' | 'unknown';
	} = {}
): RenderEvent => ({
	id: `evt-${nextSeq()}`,
	type: 'render',
	schemaVersion: '1.0.0',
	sessionId: opts.sessionId ?? 'session-1',
	componentName: opts.componentName ?? 'TestComponent',
	sequenceNumber: nextSeq(),
	timestamp: opts.wallTimestamp ?? Date.now(),
	wallTimestamp: opts.wallTimestamp ?? Date.now(),
	renderNumber: opts.renderNumber ?? 1,
	triggeredBy: opts.triggeredBy ?? 'props',
});

export const makeScoreEvent = (
	opts: {
		sessionId?: string;
		componentName?: string;
		renderNumber?: number;
		score?: number;
		grade?: HealthGrade;
		memoClassification?: MemoClassification;
		signalKind?: SignalKind | null;
	} = {}
): ScoreEvent => {
	const score = opts.score ?? 80;
	const grade: HealthGrade = opts.grade ?? (score >= 90 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'MODERATE' : score >= 30 ? 'POOR' : 'CRITICAL');
	return {
		id: `evt-${nextSeq()}`,
		type: 'score',
		schemaVersion: '1.0.0',
		sessionId: opts.sessionId ?? 'session-1',
		componentName: opts.componentName ?? 'TestComponent',
		sequenceNumber: nextSeq(),
		timestamp: Date.now(),
		wallTimestamp: Date.now(),
		renderNumber: opts.renderNumber ?? 1,
		score,
		grade,
		frequencyPenalty: 0,
		instabilityPenalty: 0,
		memoPenalty: 0,
		mixedSignalPenalty: 0,
		memoClassification: opts.memoClassification ?? 'NOT_APPLICABLE',
		signalKind: opts.signalKind !== undefined ? opts.signalKind : null,
	};
};

export const makePropChangeEvent = (
	opts: {
		sessionId?: string;
		componentName?: string;
		renderNumber?: number;
		unstable?: Array<{ name: string; type: 'function' | 'object' | 'array' }>;
		signalKind?: SignalKind;
		inferredTrigger?: 'no-prop-change' | 'genuine-prop-change' | 'reference-instability' | 'mixed';
	} = {}
): PropChangeEvent => ({
	id: `evt-${nextSeq()}`,
	type: 'prop-change',
	schemaVersion: '1.0.0',
	sessionId: opts.sessionId ?? 'session-1',
	componentName: opts.componentName ?? 'TestComponent',
	sequenceNumber: nextSeq(),
	timestamp: Date.now(),
	wallTimestamp: Date.now(),
	renderNumber: opts.renderNumber ?? 1,
	changed: [],
	unstable: opts.unstable ?? [],
	inferredTrigger: opts.inferredTrigger ?? 'no-prop-change',
	signalKind: opts.signalKind ?? 'genuine',
});

export const makeFrequencyEvent = (
	opts: {
		sessionId?: string;
		componentName?: string;
		classification?: FrequencyClass;
	} = {}
): FrequencyEvent => ({
	id: `evt-${nextSeq()}`,
	type: 'frequency',
	schemaVersion: '1.0.0',
	sessionId: opts.sessionId ?? 'session-1',
	componentName: opts.componentName ?? 'TestComponent',
	sequenceNumber: nextSeq(),
	timestamp: Date.now(),
	wallTimestamp: Date.now(),
	renderNumber: 1,
	windowMs: 1000,
	windowCount: 5,
	rate: 5,
	classification: opts.classification ?? 'LOW',
	totalRenders: 5,
});

export const makeRecommendationEvent = (
	opts: {
		sessionId?: string;
		componentName?: string;
		recommendations?: string[];
	} = {}
): RecommendationEvent => ({
	id: `evt-${nextSeq()}`,
	type: 'recommendation',
	schemaVersion: '1.0.0',
	sessionId: opts.sessionId ?? 'session-1',
	componentName: opts.componentName ?? 'TestComponent',
	sequenceNumber: nextSeq(),
	timestamp: Date.now(),
	wallTimestamp: Date.now(),
	renderNumber: 1,
	recommendations: opts.recommendations ?? [],
});

export const makeSessionStartEvent = (opts: { sessionId?: string; componentName?: string } = {}): SessionStartEvent => ({
	id: `evt-${nextSeq()}`,
	type: 'session-start',
	schemaVersion: '1.0.0',
	sessionId: opts.sessionId ?? 'session-1',
	componentName: opts.componentName ?? 'TestComponent',
	sequenceNumber: nextSeq(),
	timestamp: Date.now(),
	wallTimestamp: Date.now(),
});

export const makeSessionEndEvent = (opts: { sessionId?: string; componentName?: string; durationMs?: number; totalRenders?: number } = {}): SessionEndEvent => ({
	id: `evt-${nextSeq()}`,
	type: 'session-end',
	schemaVersion: '1.0.0',
	sessionId: opts.sessionId ?? 'session-1',
	componentName: opts.componentName ?? 'TestComponent',
	sequenceNumber: nextSeq(),
	timestamp: Date.now(),
	wallTimestamp: Date.now(),
	totalRenders: opts.totalRenders ?? 5,
	durationMs: opts.durationMs ?? 1000,
	finalScore: null,
});

export const makeSessionData = (
	opts: {
		componentName?: string;
		sessionId?: string;
		events?: TelemetryEvent[];
	} = {}
): ComponentSessionData => ({
	componentName: opts.componentName ?? 'TestComponent',
	sessionId: opts.sessionId ?? 'session-1',
	events: Object.freeze(opts.events ?? []),
	frames: null,
});

export const makeComponentAnalysis = (overrides: Partial<ComponentAnalysis> = {}): ComponentAnalysis => ({
	componentName: 'TestComponent',
	sessionIds: ['session-1'],
	totalRenders: 10,
	totalSessions: 1,
	averageScore: 80,
	minScore: 70,
	maxScore: 90,
	grade: 'GOOD',
	memoClassification: null,
	frequencyClass: null,
	unstablePropNames: [],
	unstablePropTypes: [],
	uniqueRecommendations: [],
	scoreTrend: 'stable',
	renderVelocity: 2,
	ineffectiveRenderCount: 0,
	noChangeRenderCount: 0,
	...overrides,
});
