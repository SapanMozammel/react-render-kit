import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeComponents } from '../src/analyzer/component-analyzer.js';
import { resetSeq, makeSessionData, makeRenderEvent, makeScoreEvent, makePropChangeEvent, makeFrequencyEvent, makeRecommendationEvent } from './helpers.js';

beforeEach(() => resetSeq());

describe('analyzeComponents', () => {
	it('returns empty array for empty input', () => {
		expect(analyzeComponents([])).toHaveLength(0);
	});

	it('groups sessions from same component together', () => {
		const data = [
			makeSessionData({ componentName: 'A', sessionId: 's1', events: [makeRenderEvent({ sessionId: 's1', componentName: 'A' })] }),
			makeSessionData({ componentName: 'A', sessionId: 's2', events: [makeRenderEvent({ sessionId: 's2', componentName: 'A' })] }),
			makeSessionData({ componentName: 'B', sessionId: 's1', events: [makeRenderEvent({ sessionId: 's1', componentName: 'B' })] }),
		];
		const result = analyzeComponents(data);
		expect(result).toHaveLength(2);
		const a = result.find((c) => c.componentName === 'A')!;
		expect(a.totalSessions).toBe(2);
		expect(a.sessionIds).toHaveLength(2);
	});

	it('extracts average score from ScoreEvents', () => {
		const events = [makeScoreEvent({ score: 80 }), makeScoreEvent({ score: 60 })];
		const data = [makeSessionData({ events })];
		const result = analyzeComponents(data);
		expect(result[0]!.averageScore).toBe(70);
	});

	it('returns grade 0 and CRITICAL when no score events', () => {
		const data = [makeSessionData({ events: [makeRenderEvent()] })];
		const result = analyzeComponents(data);
		expect(result[0]!.averageScore).toBe(0);
		expect(result[0]!.grade).toBe('CRITICAL');
	});

	it('sets minScore and maxScore correctly', () => {
		const events = [makeScoreEvent({ score: 50 }), makeScoreEvent({ score: 90 }), makeScoreEvent({ score: 70 })];
		const data = [makeSessionData({ events })];
		const result = analyzeComponents(data);
		expect(result[0]!.minScore).toBe(50);
		expect(result[0]!.maxScore).toBe(90);
	});

	it('returns null minScore/maxScore when no score events', () => {
		const data = [makeSessionData({ events: [] })];
		const result = analyzeComponents(data);
		expect(result[0]!.minScore).toBeNull();
		expect(result[0]!.maxScore).toBeNull();
	});

	it('collects unique unstable prop names', () => {
		const events = [
			makePropChangeEvent({
				unstable: [
					{ name: 'onClick', type: 'function' },
					{ name: 'style', type: 'object' },
				],
			}),
			makePropChangeEvent({ unstable: [{ name: 'onClick', type: 'function' }] }),
		];
		const data = [makeSessionData({ events })];
		const result = analyzeComponents(data);
		expect(result[0]!.unstablePropNames).toContain('onClick');
		expect(result[0]!.unstablePropNames).toContain('style');
		expect(result[0]!.unstablePropNames).toHaveLength(2);
	});

	it('picks worst-case frequency class', () => {
		const events = [makeFrequencyEvent({ classification: 'LOW' }), makeFrequencyEvent({ classification: 'HIGH' }), makeFrequencyEvent({ classification: 'MODERATE' })];
		const data = [makeSessionData({ events })];
		const result = analyzeComponents(data);
		expect(result[0]!.frequencyClass).toBe('HIGH');
	});

	it('returns null frequencyClass when no frequency events', () => {
		const data = [makeSessionData({ events: [makeRenderEvent()] })];
		const result = analyzeComponents(data);
		expect(result[0]!.frequencyClass).toBeNull();
	});

	it('counts noChangeRenderCount from parent-triggered renders', () => {
		const events = [makeRenderEvent({ triggeredBy: 'parent' }), makeRenderEvent({ triggeredBy: 'parent' }), makeRenderEvent({ triggeredBy: 'props' })];
		const data = [makeSessionData({ events })];
		const result = analyzeComponents(data);
		expect(result[0]!.noChangeRenderCount).toBe(2);
		expect(result[0]!.totalRenders).toBe(3);
	});

	it('counts ineffectiveRenderCount from reference-only signals', () => {
		const events = [makeScoreEvent({ signalKind: 'reference-only' }), makeScoreEvent({ signalKind: 'genuine' }), makeScoreEvent({ signalKind: 'reference-only' })];
		const data = [makeSessionData({ events })];
		const result = analyzeComponents(data);
		expect(result[0]!.ineffectiveRenderCount).toBe(2);
	});

	it('collects unique recommendations', () => {
		const events = [makeRecommendationEvent({ recommendations: ['Fix A', 'Fix B'] }), makeRecommendationEvent({ recommendations: ['Fix A', 'Fix C'] })];
		const data = [makeSessionData({ events })];
		const result = analyzeComponents(data);
		expect(result[0]!.uniqueRecommendations).toHaveLength(3);
	});

	it('scoreTrend: insufficient-data when fewer than 4 scores', () => {
		const events = [makeScoreEvent({ score: 80 }), makeScoreEvent({ score: 70 }), makeScoreEvent({ score: 60 })];
		const data = [makeSessionData({ events })];
		expect(analyzeComponents(data)[0]!.scoreTrend).toBe('insufficient-data');
	});

	it('scoreTrend: improving when second half scores are higher', () => {
		const events = [40, 50, 70, 80].map((s) => makeScoreEvent({ score: s }));
		const data = [makeSessionData({ events })];
		expect(analyzeComponents(data)[0]!.scoreTrend).toBe('improving');
	});

	it('scoreTrend: degrading when second half scores are lower', () => {
		const events = [80, 75, 40, 30].map((s) => makeScoreEvent({ score: s }));
		const data = [makeSessionData({ events })];
		expect(analyzeComponents(data)[0]!.scoreTrend).toBe('degrading');
	});

	it('scoreTrend: stable when no significant delta', () => {
		const events = [78, 79, 80, 81].map((s) => makeScoreEvent({ score: s }));
		const data = [makeSessionData({ events })];
		expect(analyzeComponents(data)[0]!.scoreTrend).toBe('stable');
	});

	it('derives memoClassification from majority vote', () => {
		const events = [makeScoreEvent({ memoClassification: 'INEFFECTIVE' }), makeScoreEvent({ memoClassification: 'INEFFECTIVE' }), makeScoreEvent({ memoClassification: 'EFFECTIVE' })];
		const data = [makeSessionData({ events })];
		expect(analyzeComponents(data)[0]!.memoClassification).toBe('INEFFECTIVE');
	});
});
