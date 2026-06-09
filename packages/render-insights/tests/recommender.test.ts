import { describe, expect, it } from 'vitest';
import { generateRecommendations } from '../src/recommendations/recommender.js';
import type { PropInstability } from '../src/types/index.js';

const fn = (name: string): PropInstability => ({ name, type: 'function' });
const obj = (name: string): PropInstability => ({ name, type: 'object' });
const arr = (name: string): PropInstability => ({ name, type: 'array' });

describe('generateRecommendations', () => {
	// ── Rule 1 — STABILIZE_INEFFECTIVE ──────────────────────────────────────

	it('Rule 1 fires: unstableProps.length > 0 AND sessionClass === INEFFECTIVE', () => {
		const recs = generateRecommendations({ unstableProps: [fn('onSelect')], sessionClass: 'INEFFECTIVE', frequencyClass: 'LOW' });
		expect(recs).toHaveLength(1);
		expect(recs[0]).toContain('defeating memoization');
		expect(recs[0]).toContain('"onSelect"');
	});

	it('Rule 1: single function prop → useCallback hint', () => {
		const recs = generateRecommendations({ unstableProps: [fn('cb')], sessionClass: 'INEFFECTIVE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('useCallback');
	});

	it('Rule 1: single object prop → useMemo hint', () => {
		const recs = generateRecommendations({ unstableProps: [obj('cfg')], sessionClass: 'INEFFECTIVE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('useMemo');
	});

	it('Rule 1: mixed function + object props → both useCallback and useMemo hints', () => {
		const recs = generateRecommendations({ unstableProps: [fn('cb'), obj('cfg')], sessionClass: 'INEFFECTIVE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('useCallback');
		expect(recs[0]).toContain('useMemo');
	});

	// ── Rule 2 — STABILIZE_PARTIAL ───────────────────────────────────────────

	it('Rule 2 fires: unstableProps.length > 0 AND sessionClass === PARTIALLY_EFFECTIVE', () => {
		const recs = generateRecommendations({ unstableProps: [fn('onSelect')], sessionClass: 'PARTIALLY_EFFECTIVE', frequencyClass: 'LOW' });
		expect(recs).toHaveLength(1);
		expect(recs[0]).toContain('partially defeating');
		expect(recs[0]).toContain('"onSelect"');
	});

	// ── Rules 1 and 2 mutual exclusion ──────────────────────────────────────

	it('Rule 1 fires for INEFFECTIVE, not Rule 2', () => {
		const recs = generateRecommendations({ unstableProps: [fn('x')], sessionClass: 'INEFFECTIVE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('defeating memoization');
		expect(recs[0]).not.toContain('partially');
	});

	it('Rule 2 fires for PARTIALLY_EFFECTIVE, not Rule 1', () => {
		const recs = generateRecommendations({ unstableProps: [fn('x')], sessionClass: 'PARTIALLY_EFFECTIVE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('partially defeating');
		expect(recs[0]).not.toContain('Reference-only');
	});

	// ── Rule 3 — HIGH_FREQUENCY_COMPOUND ────────────────────────────────────

	it('Rule 3 fires: frequencyClass === HIGH AND unstableProps.length > 0', () => {
		const recs = generateRecommendations({ unstableProps: [fn('cb')], sessionClass: 'EFFECTIVE', frequencyClass: 'HIGH' });
		expect(recs.some((r) => r.includes('High render frequency compounded'))).toBe(true);
	});

	// ── Rule 4 — HIGH_FREQUENCY_CLEAN ───────────────────────────────────────

	it('Rule 4 fires: frequencyClass === HIGH AND unstableProps.length === 0', () => {
		const recs = generateRecommendations({ unstableProps: [], sessionClass: 'EFFECTIVE', frequencyClass: 'HIGH' });
		expect(recs[0]).toContain('High render frequency with no reference instability');
	});

	// ── Rule 5 — WELL_OPTIMIZED fallback ────────────────────────────────────

	it('Rule 5 fires when rules 1–4 all produce no output', () => {
		const recs = generateRecommendations({ unstableProps: [], sessionClass: 'EFFECTIVE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('well-optimized');
	});

	it('Rule 5 does NOT fire when Rule 4 fires', () => {
		const recs = generateRecommendations({ unstableProps: [], sessionClass: 'EFFECTIVE', frequencyClass: 'HIGH' });
		expect(recs.some((r) => r.includes('well-optimized'))).toBe(false);
	});

	it('Rule 5 does NOT fire when Rule 1 fires', () => {
		const recs = generateRecommendations({ unstableProps: [fn('x')], sessionClass: 'INEFFECTIVE', frequencyClass: 'LOW' });
		expect(recs.some((r) => r.includes('well-optimized'))).toBe(false);
	});

	// ── Multi-rule simultaneous firing ──────────────────────────────────────

	it('Rule 1 + Rule 3 both fire (INEFFECTIVE + HIGH + unstable props)', () => {
		const recs = generateRecommendations({ unstableProps: [fn('cb')], sessionClass: 'INEFFECTIVE', frequencyClass: 'HIGH' });
		expect(recs.some((r) => r.includes('defeating memoization'))).toBe(true);
		expect(recs.some((r) => r.includes('High render frequency compounded'))).toBe(true);
	});

	it('Rule 2 + Rule 3 both fire (PARTIALLY_EFFECTIVE + HIGH + unstable props)', () => {
		const recs = generateRecommendations({ unstableProps: [obj('cfg')], sessionClass: 'PARTIALLY_EFFECTIVE', frequencyClass: 'HIGH' });
		expect(recs.some((r) => r.includes('partially defeating'))).toBe(true);
		expect(recs.some((r) => r.includes('High render frequency compounded'))).toBe(true);
	});

	it('at most 3 recommendations returned', () => {
		// Rules 1 + 3: 2 recs max for these inputs (only 2 rules can fire simultaneously for non-HIGH freq)
		const recs = generateRecommendations({ unstableProps: [fn('a'), fn('b')], sessionClass: 'INEFFECTIVE', frequencyClass: 'HIGH' });
		expect(recs.length).toBeLessThanOrEqual(3);
	});

	// ── {names} formatting ───────────────────────────────────────────────────

	it('{names} for 1 prop: "propName"', () => {
		const recs = generateRecommendations({ unstableProps: [fn('onSelect')], sessionClass: 'INEFFECTIVE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('"onSelect"');
	});

	it('{names} for 2 props: "a" and "b"', () => {
		const recs = generateRecommendations({ unstableProps: [fn('onSelect'), obj('config')], sessionClass: 'INEFFECTIVE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('"onSelect"');
		expect(recs[0]).toContain('"config"');
	});

	it('{names} for 3+ props: "a", "b", and "c"', () => {
		const recs = generateRecommendations({ unstableProps: [fn('a'), fn('b'), fn('c')], sessionClass: 'INEFFECTIVE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('"a"');
		expect(recs[0]).toContain('"b"');
		expect(recs[0]).toContain('"c"');
		expect(recs[0]).toContain('and');
	});

	// ── Array type → useMemo ─────────────────────────────────────────────────

	it('array prop type → useMemo hint in Rule 1', () => {
		const recs = generateRecommendations({ unstableProps: [arr('items')], sessionClass: 'INEFFECTIVE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('useMemo');
		expect(recs[0]).not.toContain('useCallback');
	});

	// ── NOT_APPLICABLE does not fire Rule 1 or 2 ────────────────────────────

	it('NOT_APPLICABLE session with unstable props → Rule 5 fires (neither Rule 1 nor 2)', () => {
		const recs = generateRecommendations({ unstableProps: [fn('x')], sessionClass: 'NOT_APPLICABLE', frequencyClass: 'LOW' });
		expect(recs[0]).toContain('well-optimized');
	});
});
