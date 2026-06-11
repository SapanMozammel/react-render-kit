import { describe, it, expect } from 'vitest';
import {
	createTelemetrySession,
	createSessionStartEvent,
	createRenderEvent,
	createPropChangeEvent,
	createFrequencyEvent,
	createScoreEvent,
	createRecommendationEvent,
	createSessionEndEvent,
	endTelemetrySession,
} from '../src/index.js';

const makeSession = () => createTelemetrySession('TestComponent');

describe('createSessionStartEvent', () => {
	it('event.type is session-start', () => {
		const session = makeSession();
		const { event } = createSessionStartEvent(session);
		expect(event.type).toBe('session-start');
	});

	it('event.sessionId matches session.id', () => {
		const session = makeSession();
		const { event } = createSessionStartEvent(session);
		expect(event.sessionId).toBe(session.id);
	});

	it('event.componentName matches session.componentName', () => {
		const session = makeSession();
		const { event } = createSessionStartEvent(session);
		expect(event.componentName).toBe(session.componentName);
	});

	it('sequenceNumber is counter+1', () => {
		const session = makeSession();
		const { event, session: updated } = createSessionStartEvent(session);
		expect(event.sequenceNumber).toBe(session.sequenceCounter + 1);
		expect(updated.sequenceCounter).toBe(session.sequenceCounter + 1);
	});

	it('input session is not mutated', () => {
		const session = makeSession();
		const originalCounter = session.sequenceCounter;
		createSessionStartEvent(session);
		expect(session.sequenceCounter).toBe(originalCounter);
	});

	it('returned session is a new reference', () => {
		const session = makeSession();
		const { session: updated } = createSessionStartEvent(session);
		expect(updated).not.toBe(session);
	});
});

describe('createRenderEvent', () => {
	it('event.type is render', () => {
		const session = makeSession();
		const { event } = createRenderEvent(session, { renderNumber: 1 });
		expect(event.type).toBe('render');
	});

	it('renderNumber matches input', () => {
		const session = makeSession();
		const { event } = createRenderEvent(session, { renderNumber: 3 });
		expect(event.renderNumber).toBe(3);
	});

	it('triggeredBy defaults to unknown when omitted', () => {
		const session = makeSession();
		const { event } = createRenderEvent(session, { renderNumber: 1 });
		expect(event.triggeredBy).toBe('unknown');
	});

	it('triggeredBy uses provided value', () => {
		const session = makeSession();
		const { event } = createRenderEvent(session, { renderNumber: 1, triggeredBy: 'props' });
		expect(event.triggeredBy).toBe('props');
	});

	it('increments sequenceCounter', () => {
		const session = makeSession();
		const { session: updated } = createRenderEvent(session, { renderNumber: 1 });
		expect(updated.sequenceCounter).toBe(1);
	});
});

describe('createPropChangeEvent', () => {
	const propData = {
		renderNumber: 2,
		changed: [{ kind: 'value-changed' as const, key: 'name', prev: 'a', next: 'b' }],
		unstable: [{ name: 'onClick', type: 'function' as const }],
		inferredTrigger: 'genuine-prop-change' as const,
		signalKind: 'genuine' as const,
	};

	it('event.type is prop-change', () => {
		const session = makeSession();
		const { event } = createPropChangeEvent(session, propData);
		expect(event.type).toBe('prop-change');
	});

	it('signalKind is set from data', () => {
		const session = makeSession();
		const { event } = createPropChangeEvent(session, propData);
		expect(event.signalKind).toBe('genuine');
	});

	it('changed array matches data', () => {
		const session = makeSession();
		const { event } = createPropChangeEvent(session, propData);
		expect(event.changed).toBe(propData.changed);
	});

	it('unstable array matches data', () => {
		const session = makeSession();
		const { event } = createPropChangeEvent(session, propData);
		expect(event.unstable).toBe(propData.unstable);
	});

	it('inferredTrigger matches data', () => {
		const session = makeSession();
		const { event } = createPropChangeEvent(session, propData);
		expect(event.inferredTrigger).toBe('genuine-prop-change');
	});
});

describe('createFrequencyEvent', () => {
	const freqData = {
		renderNumber: 2,
		windowMs: 10000,
		windowCount: 3,
		rate: 0.3,
		classification: 'LOW' as const,
		totalRenders: 5,
	};

	it('event.type is frequency', () => {
		const session = makeSession();
		const { event } = createFrequencyEvent(session, freqData);
		expect(event.type).toBe('frequency');
	});

	it('all fields match data', () => {
		const session = makeSession();
		const { event } = createFrequencyEvent(session, freqData);
		expect(event.windowMs).toBe(10000);
		expect(event.windowCount).toBe(3);
		expect(event.rate).toBe(0.3);
		expect(event.classification).toBe('LOW');
		expect(event.totalRenders).toBe(5);
	});
});

describe('createScoreEvent', () => {
	const scoreData = {
		renderNumber: 2,
		score: 72,
		grade: 'GOOD' as const,
		frequencyPenalty: 0,
		instabilityPenalty: 8,
		memoPenalty: 20,
		mixedSignalPenalty: 0,
		memoClassification: 'INEFFECTIVE' as const,
		signalKind: 'reference-only' as const,
	};

	it('event.type is score', () => {
		const session = makeSession();
		const { event } = createScoreEvent(session, scoreData);
		expect(event.type).toBe('score');
	});

	it('memoClassification is set from data', () => {
		const session = makeSession();
		const { event } = createScoreEvent(session, scoreData);
		expect(event.memoClassification).toBe('INEFFECTIVE');
	});

	it('signalKind is set from data', () => {
		const session = makeSession();
		const { event } = createScoreEvent(session, scoreData);
		expect(event.signalKind).toBe('reference-only');
	});

	it('signalKind can be null', () => {
		const session = makeSession();
		const { event } = createScoreEvent(session, { ...scoreData, signalKind: null });
		expect(event.signalKind).toBeNull();
	});

	it('score and grade match data', () => {
		const session = makeSession();
		const { event } = createScoreEvent(session, scoreData);
		expect(event.score).toBe(72);
		expect(event.grade).toBe('GOOD');
	});
});

describe('createRecommendationEvent', () => {
	it('event.type is recommendation', () => {
		const session = makeSession();
		const { event } = createRecommendationEvent(session, {
			renderNumber: 2,
			recommendations: ['Use useCallback'],
		});
		expect(event.type).toBe('recommendation');
	});

	it('recommendations array matches data', () => {
		const session = makeSession();
		const recs = ['Use useCallback', 'Wrap with memo'];
		const { event } = createRecommendationEvent(session, { renderNumber: 2, recommendations: recs });
		expect(event.recommendations).toBe(recs);
	});
});

describe('createSessionEndEvent', () => {
	it('event.type is session-end', () => {
		const session = makeSession();
		const { event } = createSessionEndEvent(session, { totalRenders: 5 });
		expect(event.type).toBe('session-end');
	});

	it('durationMs is a non-negative number', () => {
		const session = makeSession();
		const { event } = createSessionEndEvent(session, { totalRenders: 5 });
		expect(typeof event.durationMs).toBe('number');
		expect(event.durationMs).toBeGreaterThanOrEqual(0);
	});

	it('finalScore defaults to null', () => {
		const session = makeSession();
		const { event } = createSessionEndEvent(session, { totalRenders: 5 });
		expect(event.finalScore).toBeNull();
	});

	it('finalScore uses provided value', () => {
		const session = makeSession();
		const { event } = createSessionEndEvent(session, { totalRenders: 5, finalScore: 84 });
		expect(event.finalScore).toBe(84);
	});

	it('uses endTimestamp from ended session for durationMs', () => {
		const session = makeSession();
		const ended = endTelemetrySession(session);
		const { event } = createSessionEndEvent(ended, { totalRenders: 3 });
		expect(event.durationMs).toBeGreaterThanOrEqual(0);
	});
});

describe('sequential factory calls (sequenceNumber chain)', () => {
	it('produces sequenceNumbers 1, 2, 3 for three consecutive calls', () => {
		let session = makeSession();
		const r1 = createSessionStartEvent(session);
		session = r1.session;
		const r2 = createRenderEvent(session, { renderNumber: 1 });
		session = r2.session;
		const r3 = createRenderEvent(session, { renderNumber: 2 });

		expect(r1.event.sequenceNumber).toBe(1);
		expect(r2.event.sequenceNumber).toBe(2);
		expect(r3.event.sequenceNumber).toBe(3);
	});
});
