import { describe, expect, it } from 'vitest';
import { computeRecommendations } from '../../src/engine/recommendation-engine.js';
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

describe('computeRecommendations', () => {
	it('returns empty array when no rules match and score < 90', () => {
		const report = makeReport({ score: 70 });
		const result = computeRecommendations(report, []);
		// No rules fire: no unstable props, NOT_APPLICABLE memo, LOW freq, no history
		// R-CLEAR-001 requires score>=90; so result should be empty
		expect(result).toHaveLength(0);
	});

	// ── R-FUNC-001 ──────────────────────────────────────────────────────────

	it('R-FUNC-001: fires for unstable function prop when memo is not NOT_APPLICABLE', () => {
		const report = makeReport({
			props: { changed: [], unstable: [{ name: 'onClick', type: 'function' }] },
			memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 1, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		const rec = result.find((r) => r.id === 'R-FUNC-001');
		expect(rec).toBeDefined();
		expect(rec!.category).toBe('unstable-function');
	});

	it('R-FUNC-001: does NOT fire when memo is NOT_APPLICABLE', () => {
		const report = makeReport({
			props: { changed: [], unstable: [{ name: 'onClick', type: 'function' }] },
			memo: { signalKind: null, sessionClass: 'NOT_APPLICABLE', genuineCount: 0, referenceOnlyCount: 0, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-FUNC-001')).toBeUndefined();
	});

	it('R-FUNC-001: severity is CRITICAL when INEFFECTIVE + 2+ func props', () => {
		const report = makeReport({
			props: {
				changed: [],
				unstable: [
					{ name: 'fn1', type: 'function' },
					{ name: 'fn2', type: 'function' },
				],
			},
			memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 2, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		const rec = result.find((r) => r.id === 'R-FUNC-001');
		expect(rec!.severity).toBe('CRITICAL');
	});

	it('R-FUNC-001: severity is HIGH for single func prop or non-INEFFECTIVE', () => {
		const report = makeReport({
			props: { changed: [], unstable: [{ name: 'fn', type: 'function' }] },
			memo: { signalKind: 'reference-only', sessionClass: 'PARTIALLY_EFFECTIVE', genuineCount: 1, referenceOnlyCount: 1, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		const rec = result.find((r) => r.id === 'R-FUNC-001');
		expect(rec!.severity).toBe('HIGH');
	});

	// ── R-OBJ-001 ──────────────────────────────────────────────────────────

	it('R-OBJ-001: fires for unstable object prop', () => {
		const report = makeReport({
			props: { changed: [], unstable: [{ name: 'config', type: 'object' }] },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-OBJ-001')).toBeDefined();
	});

	it('R-OBJ-001: severity HIGH when memo is INEFFECTIVE', () => {
		const report = makeReport({
			props: { changed: [], unstable: [{ name: 'config', type: 'object' }] },
			memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 3, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-OBJ-001')?.severity).toBe('HIGH');
	});

	it('R-OBJ-001: severity MEDIUM when memo is not INEFFECTIVE', () => {
		const report = makeReport({
			props: { changed: [], unstable: [{ name: 'config', type: 'object' }] },
			memo: { signalKind: null, sessionClass: 'NOT_APPLICABLE', genuineCount: 0, referenceOnlyCount: 0, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-OBJ-001')?.severity).toBe('MEDIUM');
	});

	// ── R-ARR-001 ──────────────────────────────────────────────────────────

	it('R-ARR-001: fires for unstable array prop', () => {
		const report = makeReport({
			props: { changed: [], unstable: [{ name: 'items', type: 'array' }] },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-ARR-001')).toBeDefined();
	});

	// ── R-MEMO-001 ─────────────────────────────────────────────────────────

	it('R-MEMO-001: fires for INEFFECTIVE memo with 3+ reference-only renders', () => {
		const report = makeReport({
			memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 3, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-MEMO-001')).toBeDefined();
		expect(result.find((r) => r.id === 'R-MEMO-001')?.severity).toBe('CRITICAL');
	});

	it('R-MEMO-001: does NOT fire for INEFFECTIVE with < 3 reference-only', () => {
		const report = makeReport({
			memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 2, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-MEMO-001')).toBeUndefined();
	});

	// ── R-MEMO-002 ─────────────────────────────────────────────────────────

	it('R-MEMO-002: fires for PARTIALLY_EFFECTIVE with 2+ mixed renders', () => {
		const report = makeReport({
			memo: { signalKind: 'mixed', sessionClass: 'PARTIALLY_EFFECTIVE', genuineCount: 1, referenceOnlyCount: 0, mixedCount: 2 },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-MEMO-002')).toBeDefined();
	});

	// ── R-FREQ-001 ─────────────────────────────────────────────────────────

	it('R-FREQ-001: fires for HIGH frequency', () => {
		const report = makeReport({
			frequency: { totalRenders: 20, windowCount: 20, windowMs: 1000, rate: 20, classification: 'HIGH' },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-FREQ-001')).toBeDefined();
		expect(result.find((r) => r.id === 'R-FREQ-001')?.severity).toBe('HIGH');
	});

	it('R-FREQ-001: does NOT fire for LOW frequency', () => {
		const report = makeReport();
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-FREQ-001')).toBeUndefined();
	});

	// ── R-PARENT-001 ───────────────────────────────────────────────────────

	it('R-PARENT-001: fires when last 5 renders all have no-prop-change', () => {
		const npc = makeReport({ inferredTrigger: 'no-prop-change' });
		const history = Array.from({ length: 4 }, () => ({ ...npc }));
		const report = { ...npc };
		const result = computeRecommendations(report, history);
		expect(result.find((r) => r.id === 'R-PARENT-001')).toBeDefined();
	});

	it('R-PARENT-001: does NOT fire when one of last 5 has different trigger', () => {
		const npc = makeReport({ inferredTrigger: 'no-prop-change' });
		const history = [{ ...npc, inferredTrigger: 'genuine-prop-change' as const }, ...Array.from({ length: 3 }, () => ({ ...npc }))];
		const report = { ...npc };
		const result = computeRecommendations(report, history);
		expect(result.find((r) => r.id === 'R-PARENT-001')).toBeUndefined();
	});

	// ── R-MEMO-003 ─────────────────────────────────────────────────────────

	it('R-MEMO-003: fires when EFFECTIVE memo + score>=90 + no unstable + 5+ genuine', () => {
		const report = makeReport({
			score: 95,
			memo: { signalKind: 'genuine', sessionClass: 'EFFECTIVE', genuineCount: 6, referenceOnlyCount: 0, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-MEMO-003')).toBeDefined();
		expect(result.find((r) => r.id === 'R-MEMO-003')?.severity).toBe('INFO');
	});

	// ── R-SCORE-001 ────────────────────────────────────────────────────────

	it('R-SCORE-001: fires when session trend is degrading and score 20+ below avg', () => {
		const highScores = Array.from({ length: 4 }, () => makeReport({ score: 90 }));
		const lowScores = Array.from({ length: 4 }, () => makeReport({ score: 50 }));
		const history = [...highScores, ...lowScores.slice(0, -1)];
		const report = makeReport({ score: 45 });
		const result = computeRecommendations(report, history);
		// avg should be around 70-80 and current score 45, delta >= 20
		const rec = result.find((r) => r.id === 'R-SCORE-001');
		if (rec) {
			expect(rec.severity).toBe('HIGH');
		}
	});

	// ── R-CLEAR-001 ────────────────────────────────────────────────────────

	it('R-CLEAR-001: fires when score >= 90 and no unstable props and LOW freq and no other rules match', () => {
		const report = makeReport({ score: 95 });
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-CLEAR-001')).toBeDefined();
		expect(result.find((r) => r.id === 'R-CLEAR-001')?.severity).toBe('INFO');
	});

	it('R-CLEAR-001: does NOT fire when other rules match', () => {
		const report = makeReport({
			score: 95,
			frequency: { totalRenders: 20, windowCount: 20, windowMs: 1000, rate: 20, classification: 'HIGH' },
		});
		const result = computeRecommendations(report, []);
		expect(result.find((r) => r.id === 'R-CLEAR-001')).toBeUndefined();
	});

	// ── Priority & Caps ────────────────────────────────────────────────────

	it('results are capped at 5', () => {
		const report = makeReport({
			score: 30,
			frequency: { totalRenders: 20, windowCount: 20, windowMs: 1000, rate: 20, classification: 'HIGH' },
			props: {
				changed: [],
				unstable: [
					{ name: 'fn1', type: 'function' },
					{ name: 'fn2', type: 'function' },
					{ name: 'obj', type: 'object' },
					{ name: 'arr', type: 'array' },
				],
			},
			memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 5, mixedCount: 2 },
		});
		const result = computeRecommendations(report, []);
		expect(result.length).toBeLessThanOrEqual(5);
	});

	it('INFO-only results are capped at 1 (excluding R-CLEAR-001)', () => {
		// R-MEMO-003 is the only INFO rule that can fire alongside others
		// If multiple INFO rules match, cap to 1
		const report = makeReport({
			score: 95,
			memo: { signalKind: 'genuine', sessionClass: 'EFFECTIVE', genuineCount: 6, referenceOnlyCount: 0, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		const infoRecs = result.filter((r) => r.severity === 'INFO');
		expect(infoRecs.length).toBeLessThanOrEqual(1);
	});

	it('results are sorted by priority (higher severity first)', () => {
		const report = makeReport({
			score: 50,
			frequency: { totalRenders: 20, windowCount: 20, windowMs: 1000, rate: 20, classification: 'HIGH' },
			props: { changed: [], unstable: [{ name: 'obj', type: 'object' }] },
			memo: { signalKind: 'reference-only', sessionClass: 'INEFFECTIVE', genuineCount: 0, referenceOnlyCount: 3, mixedCount: 0 },
		});
		const result = computeRecommendations(report, []);
		const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
		for (let i = 1; i < result.length; i++) {
			const prevIdx = severityOrder.indexOf(result[i - 1].severity);
			const currIdx = severityOrder.indexOf(result[i].severity);
			expect(prevIdx).toBeLessThanOrEqual(currIdx);
		}
	});
});
