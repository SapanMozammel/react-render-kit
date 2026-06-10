import { describe, expect, it } from 'vitest';
import { computeSessionStats } from '../../src/engine/session-stats.js';
import type { InsightReport } from '@sapanmozammel/render-insights';

const makeReport = (overrides?: Partial<InsightReport>): InsightReport => ({
	componentName: 'TestComp',
	renderNumber: 1,
	reportNumber: 1,
	props: { changed: [], unstable: [] },
	frequency: { totalRenders: 1, windowCount: 1, windowMs: 1000, rate: 1, classification: 'LOW' },
	memo: { signalKind: null, sessionClass: 'NOT_APPLICABLE', genuineCount: 0, referenceOnlyCount: 0, mixedCount: 0 },
	score: 100,
	grade: 'EXCELLENT',
	inferredTrigger: 'no-prop-change',
	recommendations: [],
	...overrides,
});

describe('computeSessionStats', () => {
	it('returns stable defaults for empty history', () => {
		const stats = computeSessionStats([]);
		expect(stats.windowSize).toBe(0);
		expect(stats.scoreTrend).toBe('stable');
		expect(stats.memoTrend).toBe('stable');
		expect(stats.mostUnstableProp).toBeNull();
		expect(stats.averageScore).toBe(0);
	});

	it('windowSize equals history length when ≤ 20', () => {
		const history = Array.from({ length: 5 }, () => makeReport());
		const stats = computeSessionStats(history);
		expect(stats.windowSize).toBe(5);
	});

	it('windowSize is capped at 20 (default windowSize)', () => {
		const history = Array.from({ length: 30 }, () => makeReport());
		const stats = computeSessionStats(history);
		expect(stats.windowSize).toBe(20);
	});

	it('respects custom windowSize', () => {
		const history = Array.from({ length: 10 }, () => makeReport());
		const stats = computeSessionStats(history, 5);
		expect(stats.windowSize).toBe(5);
	});

	it('averageScore is rounded correctly', () => {
		const history = [makeReport({ score: 90 }), makeReport({ score: 80 })];
		const stats = computeSessionStats(history);
		expect(stats.averageScore).toBe(85);
	});

	it('worstScore is minimum score in window', () => {
		const history = [makeReport({ score: 90 }), makeReport({ score: 50 }), makeReport({ score: 70 })];
		const stats = computeSessionStats(history);
		expect(stats.worstScore).toBe(50);
	});

	it('bestScore is maximum score in window', () => {
		const history = [makeReport({ score: 90 }), makeReport({ score: 50 }), makeReport({ score: 95 })];
		const stats = computeSessionStats(history);
		expect(stats.bestScore).toBe(95);
	});

	it('mostFrequentTrigger returns the mode trigger', () => {
		const history = [
			makeReport({ inferredTrigger: 'no-prop-change' }),
			makeReport({ inferredTrigger: 'no-prop-change' }),
			makeReport({ inferredTrigger: 'genuine-prop-change' }),
		];
		const stats = computeSessionStats(history);
		expect(stats.mostFrequentTrigger).toBe('no-prop-change');
	});

	it('mostUnstableProp returns prop with highest occurrence count', () => {
		const history = [
			makeReport({ props: { changed: [], unstable: [{ name: 'fn', type: 'function' }] } }),
			makeReport({ props: { changed: [], unstable: [{ name: 'fn', type: 'function' }] } }),
			makeReport({ props: { changed: [], unstable: [{ name: 'obj', type: 'object' }] } }),
		];
		const stats = computeSessionStats(history);
		expect(stats.mostUnstableProp).toBe('fn');
		expect(stats.mostUnstablePropOccurrences).toBe(2);
	});

	it('mostUnstableProp is null when no unstable props', () => {
		const history = [makeReport(), makeReport()];
		const stats = computeSessionStats(history);
		expect(stats.mostUnstableProp).toBeNull();
	});

	it('scoreTrend is improving when second half avg > first half avg by >5', () => {
		const history = [
			makeReport({ score: 50 }), makeReport({ score: 55 }), // first half
			makeReport({ score: 80 }), makeReport({ score: 85 }), // second half
		];
		const stats = computeSessionStats(history);
		expect(stats.scoreTrend).toBe('improving');
	});

	it('scoreTrend is degrading when second half avg < first half avg by >5', () => {
		const history = [
			makeReport({ score: 90 }), makeReport({ score: 85 }), // first half
			makeReport({ score: 50 }), makeReport({ score: 55 }), // second half
		];
		const stats = computeSessionStats(history);
		expect(stats.scoreTrend).toBe('degrading');
	});

	it('scoreTrend is stable when delta ≤ 5', () => {
		const history = [
			makeReport({ score: 80 }), makeReport({ score: 80 }),
			makeReport({ score: 82 }), makeReport({ score: 82 }),
		];
		const stats = computeSessionStats(history);
		expect(stats.scoreTrend).toBe('stable');
	});

	it('memoTrend is improving when bad memo rate decreases by >0.2', () => {
		const history = [
			makeReport({ memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 1, mixedCount: 0 } }),
			makeReport({ memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 1, mixedCount: 0 } }),
			makeReport({ memo: { signalKind: 'genuine', sessionClass: 'EFFECTIVE', genuineCount: 2, referenceOnlyCount: 0, mixedCount: 0 } }),
			makeReport({ memo: { signalKind: 'genuine', sessionClass: 'EFFECTIVE', genuineCount: 2, referenceOnlyCount: 0, mixedCount: 0 } }),
		];
		const stats = computeSessionStats(history);
		expect(stats.memoTrend).toBe('improving');
	});
});
