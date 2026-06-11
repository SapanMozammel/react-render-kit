import { describe, it, expect } from 'vitest';
import { validateEvent, isKnownEventType } from '../src/index.js';

const makeBase = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
	id: 'abc-123',
	type: 'session-start',
	schemaVersion: '1.0.0',
	sessionId: 'sess-1',
	componentName: 'UserCard',
	sequenceNumber: 1,
	timestamp: 12345.0,
	wallTimestamp: 1749587600000,
	...overrides,
});

describe('validateEvent', () => {
	it('returns true for a valid SessionStartEvent', () => {
		expect(validateEvent(makeBase())).toBe(true);
	});

	it('returns true for a valid RenderEvent', () => {
		expect(validateEvent(makeBase({ type: 'render', renderNumber: 1, triggeredBy: 'props' }))).toBe(true);
	});

	it('returns true for a valid PropChangeEvent', () => {
		expect(
			validateEvent(
				makeBase({
					type: 'prop-change',
					renderNumber: 1,
					changed: [],
					unstable: [],
					inferredTrigger: 'genuine-prop-change',
					signalKind: 'genuine',
				})
			)
		).toBe(true);
	});

	it('returns true for a valid FrequencyEvent', () => {
		expect(
			validateEvent(
				makeBase({
					type: 'frequency',
					renderNumber: 1,
					windowMs: 10000,
					windowCount: 3,
					rate: 0.3,
					classification: 'LOW',
					totalRenders: 5,
				})
			)
		).toBe(true);
	});

	it('returns true for a valid ScoreEvent', () => {
		expect(
			validateEvent(
				makeBase({
					type: 'score',
					renderNumber: 1,
					score: 72,
					grade: 'GOOD',
					frequencyPenalty: 0,
					instabilityPenalty: 8,
					memoPenalty: 20,
					mixedSignalPenalty: 0,
					memoClassification: 'INEFFECTIVE',
					signalKind: 'reference-only',
				})
			)
		).toBe(true);
	});

	it('returns true for ScoreEvent with signalKind null', () => {
		expect(
			validateEvent(
				makeBase({
					type: 'score',
					renderNumber: 1,
					score: 100,
					grade: 'EXCELLENT',
					frequencyPenalty: 0,
					instabilityPenalty: 0,
					memoPenalty: 0,
					mixedSignalPenalty: 0,
					memoClassification: 'NOT_APPLICABLE',
					signalKind: null,
				})
			)
		).toBe(true);
	});

	it('returns true for a valid RecommendationEvent', () => {
		expect(
			validateEvent(
				makeBase({
					type: 'recommendation',
					renderNumber: 1,
					recommendations: ['Use useCallback'],
				})
			)
		).toBe(true);
	});

	it('returns true for a valid SessionEndEvent', () => {
		expect(
			validateEvent(
				makeBase({
					type: 'session-end',
					totalRenders: 5,
					durationMs: 1200,
					finalScore: null,
				})
			)
		).toBe(true);
	});

	it('returns false for null', () => {
		expect(validateEvent(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(validateEvent(undefined)).toBe(false);
	});

	it('returns false for a number', () => {
		expect(validateEvent(123)).toBe(false);
	});

	it('returns false for a string', () => {
		expect(validateEvent('hello')).toBe(false);
	});

	it('returns false for empty object', () => {
		expect(validateEvent({})).toBe(false);
	});

	it('returns false for unknown event type', () => {
		expect(validateEvent(makeBase({ type: 'unknown-event' }))).toBe(false);
	});

	it('returns false when sequenceNumber is 0', () => {
		expect(validateEvent(makeBase({ sequenceNumber: 0 }))).toBe(false);
	});

	it('returns false when id is missing', () => {
		const { id, ...noId } = makeBase();
		void id;
		expect(validateEvent(noId)).toBe(false);
	});

	it('returns false when sessionId is missing', () => {
		const { sessionId, ...noSid } = makeBase();
		void sessionId;
		expect(validateEvent(noSid)).toBe(false);
	});

	it('returns false for PropChangeEvent missing signalKind', () => {
		expect(
			validateEvent(
				makeBase({
					type: 'prop-change',
					renderNumber: 1,
					changed: [],
					unstable: [],
					inferredTrigger: 'genuine-prop-change',
					// signalKind intentionally omitted
				})
			)
		).toBe(false);
	});

	it('returns false for PropChangeEvent missing changed array', () => {
		expect(
			validateEvent(
				makeBase({
					type: 'prop-change',
					renderNumber: 1,
					// changed intentionally omitted
					unstable: [],
					inferredTrigger: 'genuine-prop-change',
					signalKind: 'genuine',
				})
			)
		).toBe(false);
	});

	it('returns false for ScoreEvent missing memoClassification', () => {
		expect(
			validateEvent(
				makeBase({
					type: 'score',
					renderNumber: 1,
					score: 72,
					grade: 'GOOD',
					frequencyPenalty: 0,
					instabilityPenalty: 0,
					memoPenalty: 0,
					mixedSignalPenalty: 0,
					// memoClassification intentionally omitted
					signalKind: null,
				})
			)
		).toBe(false);
	});

	it('returns false for SessionEndEvent with non-null non-number finalScore', () => {
		expect(
			validateEvent(
				makeBase({
					type: 'session-end',
					totalRenders: 5,
					durationMs: 1000,
					finalScore: 'bad',
				})
			)
		).toBe(false);
	});
});

describe('isKnownEventType', () => {
	it('returns true for all 7 known types', () => {
		const types = ['session-start', 'render', 'prop-change', 'frequency', 'score', 'recommendation', 'session-end'];
		types.forEach((t) => expect(isKnownEventType(t)).toBe(true));
	});

	it('returns false for unknown string', () => {
		expect(isKnownEventType('unknown')).toBe(false);
	});

	it('returns false for null', () => {
		expect(isKnownEventType(null)).toBe(false);
	});

	it('returns false for number', () => {
		expect(isKnownEventType(42)).toBe(false);
	});
});
