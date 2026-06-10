import { describe, expect, it } from 'vitest';
import { computeScoreBreakdown } from '../../src/engine/score-breakdown.js';
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

describe('computeScoreBreakdown', () => {
	it('returns 4 components', () => {
		const bd = computeScoreBreakdown(makeReport());
		expect(bd.components).toHaveLength(4);
	});

	// ── Frequency Penalty ───────────────────────────────────────────────────

	it('FP = 0 for LOW frequency', () => {
		const bd = computeScoreBreakdown(makeReport({ frequency: { totalRenders: 1, windowCount: 1, windowMs: 1000, rate: 1, classification: 'LOW' } }));
		expect(bd.frequencyPenalty).toBe(0);
	});

	it('FP = 0 for NOT_ENOUGH_DATA', () => {
		const bd = computeScoreBreakdown(makeReport({ frequency: { totalRenders: 0, windowCount: 0, windowMs: 1000, rate: 0, classification: 'NOT_ENOUGH_DATA' } }));
		expect(bd.frequencyPenalty).toBe(0);
	});

	it('FP = 10 for MODERATE frequency', () => {
		const bd = computeScoreBreakdown(makeReport({ frequency: { totalRenders: 5, windowCount: 5, windowMs: 1000, rate: 5, classification: 'MODERATE' } }));
		expect(bd.frequencyPenalty).toBe(10);
	});

	it('FP = 25 for HIGH frequency', () => {
		const bd = computeScoreBreakdown(makeReport({ frequency: { totalRenders: 20, windowCount: 20, windowMs: 1000, rate: 20, classification: 'HIGH' } }));
		expect(bd.frequencyPenalty).toBe(25);
	});

	// ── Instability Penalty ────────────────────────────────────────────────

	it('UP = 0 for no unstable props', () => {
		const bd = computeScoreBreakdown(makeReport({ props: { changed: [], unstable: [] } }));
		expect(bd.instabilityPenalty).toBe(0);
	});

	it('UP = 8 for 1 unstable prop', () => {
		const bd = computeScoreBreakdown(makeReport({ props: { changed: [], unstable: [{ name: 'fn', type: 'function' }] } }));
		expect(bd.instabilityPenalty).toBe(8);
	});

	it('UP = 16 for 2 unstable props', () => {
		const bd = computeScoreBreakdown(
			makeReport({
				props: {
					changed: [],
					unstable: [
						{ name: 'fn', type: 'function' },
						{ name: 'obj', type: 'object' },
					],
				},
			})
		);
		expect(bd.instabilityPenalty).toBe(16);
	});

	it('UP capped at 30 for 4+ unstable props', () => {
		const unstable = Array.from({ length: 5 }, (_, i) => ({ name: `p${i}`, type: 'function' as const }));
		const bd = computeScoreBreakdown(makeReport({ props: { changed: [], unstable } }));
		expect(bd.instabilityPenalty).toBe(30);
	});

	// ── Memo Penalty ────────────────────────────────────────────────────────

	it('MP = 0 for NOT_APPLICABLE', () => {
		const bd = computeScoreBreakdown(makeReport({ memo: { signalKind: null, sessionClass: 'NOT_APPLICABLE', genuineCount: 0, referenceOnlyCount: 0, mixedCount: 0 } }));
		expect(bd.memoPenalty).toBe(0);
	});

	it('MP = 0 for EFFECTIVE', () => {
		const bd = computeScoreBreakdown(makeReport({ memo: { signalKind: 'genuine', sessionClass: 'EFFECTIVE', genuineCount: 5, referenceOnlyCount: 0, mixedCount: 0 } }));
		expect(bd.memoPenalty).toBe(0);
	});

	it('MP = 15 for PARTIALLY_EFFECTIVE', () => {
		const bd = computeScoreBreakdown(makeReport({ memo: { signalKind: 'mixed', sessionClass: 'PARTIALLY_EFFECTIVE', genuineCount: 2, referenceOnlyCount: 1, mixedCount: 2 } }));
		expect(bd.memoPenalty).toBe(15);
	});

	it('MP = 30 for INEFFECTIVE', () => {
		const bd = computeScoreBreakdown(makeReport({ memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 5, mixedCount: 0 } }));
		expect(bd.memoPenalty).toBe(30);
	});

	// ── Mixed Signal Penalty ─────────────────────────────────────────────────

	it('MSP = 0 for 0 mixed renders', () => {
		const bd = computeScoreBreakdown(makeReport());
		expect(bd.mixedSignalPenalty).toBe(0);
	});

	it('MSP = 3 × mixedCount', () => {
		const bd = computeScoreBreakdown(makeReport({ memo: { signalKind: 'mixed', sessionClass: 'PARTIALLY_EFFECTIVE', genuineCount: 1, referenceOnlyCount: 0, mixedCount: 2 } }));
		expect(bd.mixedSignalPenalty).toBe(6);
	});

	it('MSP capped at 15', () => {
		const bd = computeScoreBreakdown(makeReport({ memo: { signalKind: 'mixed', sessionClass: 'PARTIALLY_EFFECTIVE', genuineCount: 0, referenceOnlyCount: 0, mixedCount: 10 } }));
		expect(bd.mixedSignalPenalty).toBe(15);
	});

	// ── Total ───────────────────────────────────────────────────────────────

	it('total never goes below 0', () => {
		const unstable = Array.from({ length: 5 }, (_, i) => ({ name: `p${i}`, type: 'function' as const }));
		const bd = computeScoreBreakdown(
			makeReport({
				frequency: { totalRenders: 20, windowCount: 20, windowMs: 1000, rate: 20, classification: 'HIGH' },
				props: { changed: [], unstable },
				memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 10, mixedCount: 10 },
			})
		);
		expect(bd.total).toBeGreaterThanOrEqual(0);
	});

	it('labels match expected components order', () => {
		const bd = computeScoreBreakdown(makeReport());
		const labels = bd.components.map((c) => c.label);
		expect(labels).toEqual(['Frequency', 'Prop Instability', 'Memo Effectiveness', 'Mixed Signals']);
	});
});
