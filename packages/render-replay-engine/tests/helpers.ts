import {
	createTelemetrySession,
	createSessionStartEvent,
	createRenderEvent,
	createPropChangeEvent,
	createFrequencyEvent,
	createScoreEvent,
	createRecommendationEvent,
	createSessionEndEvent,
	type TelemetryEvent,
	type TelemetrySession,
	type RenderEvent,
	type PropChangeEvent,
	type FrequencyEvent,
	type ScoreEvent,
	type RecommendationEvent,
	type SessionStartEvent,
	type SessionEndEvent,
} from '@sapanmozammel/render-telemetry-core';
import { createReplayEngine, fromEvents, type ReplayEngine, type ReplayEngineOptions } from '../src/index.js';

// ── Individual event factories ────────────────────────────────────────────────

export const makeSessionStartEvent = (session: TelemetrySession, overrides?: Partial<SessionStartEvent>): { event: SessionStartEvent; session: TelemetrySession } => {
	const result = createSessionStartEvent(session);
	if (overrides) return { event: { ...result.event, ...overrides }, session: result.session };
	return result;
};

export const makeRenderEvent = (session: TelemetrySession, renderNumber: number, overrides?: Partial<RenderEvent>): { event: RenderEvent; session: TelemetrySession } => {
	const result = createRenderEvent(session, { renderNumber, triggeredBy: 'props' });
	if (overrides) return { event: { ...result.event, ...overrides }, session: result.session };
	return result;
};

export const makePropChangeEvent = (session: TelemetrySession, renderNumber: number, overrides?: Partial<PropChangeEvent>): { event: PropChangeEvent; session: TelemetrySession } => {
	const result = createPropChangeEvent(session, {
		renderNumber,
		changed: [],
		unstable: [],
		inferredTrigger: 'genuine-prop-change',
		signalKind: 'genuine',
	});
	if (overrides) return { event: { ...result.event, ...overrides }, session: result.session };
	return result;
};

export const makeFrequencyEvent = (session: TelemetrySession, renderNumber: number, overrides?: Partial<FrequencyEvent>): { event: FrequencyEvent; session: TelemetrySession } => {
	const result = createFrequencyEvent(session, {
		renderNumber,
		windowMs: 10000,
		windowCount: 3,
		rate: 0.3,
		classification: 'LOW',
		totalRenders: renderNumber,
	});
	if (overrides) return { event: { ...result.event, ...overrides }, session: result.session };
	return result;
};

export const makeScoreEvent = (session: TelemetrySession, renderNumber: number, score = 80, overrides?: Partial<ScoreEvent>): { event: ScoreEvent; session: TelemetrySession } => {
	const result = createScoreEvent(session, {
		renderNumber,
		score,
		grade: score >= 90 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'MODERATE' : 'POOR',
		frequencyPenalty: 0,
		instabilityPenalty: 0,
		memoPenalty: 0,
		mixedSignalPenalty: 0,
		memoClassification: 'NOT_APPLICABLE',
		signalKind: null,
	});
	if (overrides) return { event: { ...result.event, ...overrides }, session: result.session };
	return result;
};

export const makeRecommendationEvent = (session: TelemetrySession, renderNumber: number, overrides?: Partial<RecommendationEvent>): { event: RecommendationEvent; session: TelemetrySession } => {
	const result = createRecommendationEvent(session, {
		renderNumber,
		recommendations: ['Use React.memo'],
	});
	if (overrides) return { event: { ...result.event, ...overrides }, session: result.session };
	return result;
};

export const makeSessionEndEvent = (session: TelemetrySession, totalRenders: number, overrides?: Partial<SessionEndEvent>): { event: SessionEndEvent; session: TelemetrySession } => {
	const result = createSessionEndEvent(session, { totalRenders, finalScore: null });
	if (overrides) return { event: { ...result.event, ...overrides }, session: result.session };
	return result;
};

// ── Full session event sequence ────────────────────────────────────────────────

type SessionEventsOptions = {
	componentName?: string;
	includeProps?: boolean;
	includeFrequency?: boolean;
	includeScore?: boolean;
	scoreValue?: number;
	includeRecommendations?: boolean;
	includeSessionEnd?: boolean;
	triggeredBy?: RenderEvent['triggeredBy'];
	// override score per render (index → score)
	scoreOverrides?: Record<number, number>;
};

export const makeSessionEvents = (renderCount: number, opts: SessionEventsOptions = {}): readonly TelemetryEvent[] => {
	const {
		componentName = 'TestComponent',
		includeProps = true,
		includeFrequency = true,
		includeScore = true,
		scoreValue = 80,
		includeRecommendations = false,
		includeSessionEnd = true,
		triggeredBy = 'props',
		scoreOverrides = {},
	} = opts;

	const events: TelemetryEvent[] = [];
	let session = createTelemetrySession(componentName);

	const startResult = createSessionStartEvent(session);
	events.push(startResult.event);
	session = startResult.session;

	for (let i = 1; i <= renderCount; i++) {
		const renderResult = createRenderEvent(session, { renderNumber: i, triggeredBy });
		events.push(renderResult.event);
		session = renderResult.session;

		if (includeProps) {
			const propsResult = createPropChangeEvent(session, {
				renderNumber: i,
				changed: [{ kind: 'value-changed', key: 'count', prev: i - 1, next: i }],
				unstable: [],
				inferredTrigger: 'genuine-prop-change',
				signalKind: 'genuine',
			});
			events.push(propsResult.event);
			session = propsResult.session;
		}

		if (includeFrequency) {
			const freqResult = createFrequencyEvent(session, {
				renderNumber: i,
				windowMs: 10000,
				windowCount: i,
				rate: i / 10,
				classification: 'LOW',
				totalRenders: i,
			});
			events.push(freqResult.event);
			session = freqResult.session;
		}

		if (includeScore) {
			const s = scoreOverrides[i] ?? scoreValue;
			const scoreResult = createScoreEvent(session, {
				renderNumber: i,
				score: s,
				grade: s >= 90 ? 'EXCELLENT' : s >= 70 ? 'GOOD' : s >= 50 ? 'MODERATE' : 'POOR',
				frequencyPenalty: 0,
				instabilityPenalty: 0,
				memoPenalty: 0,
				mixedSignalPenalty: 0,
				memoClassification: 'NOT_APPLICABLE',
				signalKind: 'genuine',
			});
			events.push(scoreResult.event);
			session = scoreResult.session;
		}

		if (includeRecommendations) {
			const recResult = createRecommendationEvent(session, {
				renderNumber: i,
				recommendations: ['Use React.memo'],
			});
			events.push(recResult.event);
			session = recResult.session;
		}
	}

	if (includeSessionEnd) {
		const endResult = createSessionEndEvent(session, { totalRenders: renderCount, finalScore: null });
		events.push(endResult.event);
	}

	return Object.freeze(events);
};

// ── Full engine convenience wrapper ───────────────────────────────────────────

export const makeEngine = (renderCount: number, opts: SessionEventsOptions & ReplayEngineOptions = {}): ReplayEngine => {
	const { maxFrames, pruningStrategy, segmentWindowSize, enableStats, enableTimeline, enableSegments, ...sessionOpts } = opts;
	const events = makeSessionEvents(renderCount, sessionOpts);
	const engineOpts: { -readonly [K in keyof ReplayEngineOptions]: ReplayEngineOptions[K] } = {};
	if (maxFrames !== undefined) engineOpts.maxFrames = maxFrames;
	if (pruningStrategy !== undefined) engineOpts.pruningStrategy = pruningStrategy;
	if (segmentWindowSize !== undefined) engineOpts.segmentWindowSize = segmentWindowSize;
	if (enableStats !== undefined) engineOpts.enableStats = enableStats;
	if (enableTimeline !== undefined) engineOpts.enableTimeline = enableTimeline;
	if (enableSegments !== undefined) engineOpts.enableSegments = enableSegments;
	return createReplayEngine(fromEvents(events), undefined, engineOpts);
};
