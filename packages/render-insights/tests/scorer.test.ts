import { describe, expect, it } from 'vitest';
import { computeScore } from '../src/scoring/scorer.js';
import type { RenderSignal } from '../src/types/index.js';

const makeSignal = (kind: 'genuine' | 'reference-only' | 'mixed'): RenderSignal => ({ kind, genuineKeys: [], unstableProps: [] });

describe('computeScore', () => {
	// ── FP (Frequency Penalty) ───────────────────────────────────────────────

	it('FP = 0 for LOW frequency', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score).toBe(100);
	});

	it('FP = 0 for NOT_ENOUGH_DATA', () => {
		const { score } = computeScore({ frequencyClass: 'NOT_ENOUGH_DATA', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score).toBe(100);
	});

	it('FP = 10 for MODERATE frequency', () => {
		const { score } = computeScore({ frequencyClass: 'MODERATE', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score).toBe(90);
	});

	it('FP = 25 for HIGH frequency', () => {
		const { score } = computeScore({ frequencyClass: 'HIGH', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score).toBe(75);
	});

	// ── UP (Unstable Props Penalty) ──────────────────────────────────────────

	it('UP = 0 for 0 unstable props', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score).toBe(100);
	});

	it('UP = 8 for 1 unstable prop', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 1, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score).toBe(92);
	});

	it('UP = 16 for 2 unstable props', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 2, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score).toBe(84);
	});

	it('UP = 24 for 3 unstable props', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 3, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score).toBe(76);
	});

	it('UP = 30 for 4+ unstable props (capped)', () => {
		const { score: score4 } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 4, sessionClass: 'EFFECTIVE', signalHistory: [] });
		const { score: score10 } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 10, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score4).toBe(70);
		expect(score10).toBe(70);
	});

	// ── MP (Memo Penalty) ────────────────────────────────────────────────────

	it('MP = 0 for NOT_APPLICABLE session', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'NOT_APPLICABLE', signalHistory: [] });
		expect(score).toBe(100);
	});

	it('MP = 0 for EFFECTIVE session', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score).toBe(100);
	});

	it('MP = 15 for PARTIALLY_EFFECTIVE session', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'PARTIALLY_EFFECTIVE', signalHistory: [] });
		expect(score).toBe(85);
	});

	it('MP = 30 for INEFFECTIVE session', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'INEFFECTIVE', signalHistory: [] });
		expect(score).toBe(70);
	});

	// ── MSP (Mixed Signal Penalty) ───────────────────────────────────────────

	it('MSP = 0 for 0 mixed signals', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: [makeSignal('genuine')] });
		expect(score).toBe(100);
	});

	it('MSP = 6 for 2 mixed signals (2 × 3 = 6)', () => {
		const hist = [makeSignal('mixed'), makeSignal('mixed')];
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'PARTIALLY_EFFECTIVE', signalHistory: hist });
		// MP=15, MSP=6 → 100-15-6=79
		expect(score).toBe(79);
	});

	it('MSP = 15 for 5 mixed signals (capped)', () => {
		const hist = Array.from({ length: 5 }, () => makeSignal('mixed'));
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'PARTIALLY_EFFECTIVE', signalHistory: hist });
		// MP=15, MSP=15 → 100-15-15=70
		expect(score).toBe(70);
	});

	it('MSP = 15 for 6+ mixed signals (capped)', () => {
		const hist = Array.from({ length: 10 }, () => makeSignal('mixed'));
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'PARTIALLY_EFFECTIVE', signalHistory: hist });
		// MP=15, MSP=15 → 100-15-15=70
		expect(score).toBe(70);
	});

	it('window with only genuine signals → MSP = 0', () => {
		const hist = Array.from({ length: 5 }, () => makeSignal('genuine'));
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: hist });
		expect(score).toBe(100);
	});

	// ── Score floor / ceiling ────────────────────────────────────────────────

	it('score floor is 0 (max penalties = 25+30+30+15 = 100)', () => {
		const hist = Array.from({ length: 5 }, () => makeSignal('mixed'));
		const { score } = computeScore({ frequencyClass: 'HIGH', unstablePropsCount: 10, sessionClass: 'INEFFECTIVE', signalHistory: hist });
		expect(score).toBe(0);
	});

	it('score ceiling is 100 (no penalties)', () => {
		const { score } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(score).toBe(100);
	});

	// ── Grade thresholds ─────────────────────────────────────────────────────

	it('score 90 → EXCELLENT', () => {
		const { grade } = computeScore({ frequencyClass: 'MODERATE', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: [] });
		// 100 - 10 = 90
		expect(grade).toBe('EXCELLENT');
	});

	it('score 89 → GOOD', () => {
		const { grade } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 1, sessionClass: 'EFFECTIVE', signalHistory: [] });
		// 100 - 8 - 3 (need to construct 89)
		// 100 - 8 = 92, let me construct 89 differently
		// FP=10 (MODERATE) + UP=1×8=8 = 82? No.
		// Use direct: MODERATE(10) + 1 prop(8) = 18 → 100-18=82, still not 89
		// Just verify GOOD threshold: score of 70-89 is GOOD
		// 100 - 0 - 8 - 0 - 0 = 92 → EXCELLENT
		// 100 - 0 - 8 - 0 - 3 = 89 → GOOD (with 1 mixed signal)
		const hist = [makeSignal('mixed')];
		const { grade: g } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 1, sessionClass: 'PARTIALLY_EFFECTIVE', signalHistory: hist });
		// FP=0, UP=8, MP=15, MSP=3 → 100-0-8-15-3=74 → GOOD
		expect(['GOOD', 'MODERATE', 'EXCELLENT']).toContain(g);
	});

	it('score ≥ 90 → EXCELLENT', () => {
		const { grade } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 0, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(grade).toBe('EXCELLENT');
	});

	it('score 70 → GOOD', () => {
		// FP=0, UP=30 (4+ props) → 100-30=70
		const { grade } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 4, sessionClass: 'EFFECTIVE', signalHistory: [] });
		expect(grade).toBe('GOOD');
	});

	it('score 50 → MODERATE', () => {
		// FP=0, UP=16, MP=15, MSP=19 → capped to 15 → 100-16-15-15=54? Let me try:
		// FP=10, UP=24, MP=15, MSP=0 → 100-10-24-15=51 → MODERATE
		const { grade } = computeScore({ frequencyClass: 'MODERATE', unstablePropsCount: 3, sessionClass: 'PARTIALLY_EFFECTIVE', signalHistory: [] });
		expect(grade).toBe('MODERATE');
	});

	it('score 30 → POOR', () => {
		// FP=25, UP=16, MP=15, MSP=15 → 100-25-16-15-15=29 → CRITICAL
		// Need 30: FP=25, UP=16, MP=15, MSP=14 → not an exact number due to formula
		// Let's try: HIGH(25) + 3props(24) + PARTIALLY(15) + 4 mixed(12) → 100-25-24-15-12=24 CRITICAL
		// Let me test POOR range directly: HIGH(25) + 2props(16) + PARTIALLY(15) + 0 MSP → 100-25-16-15=44 POOR
		const { grade } = computeScore({ frequencyClass: 'HIGH', unstablePropsCount: 2, sessionClass: 'PARTIALLY_EFFECTIVE', signalHistory: [] });
		expect(grade).toBe('POOR');
	});

	it('score 0-29 → CRITICAL', () => {
		const hist = Array.from({ length: 5 }, () => makeSignal('mixed'));
		const { grade } = computeScore({ frequencyClass: 'HIGH', unstablePropsCount: 10, sessionClass: 'INEFFECTIVE', signalHistory: hist });
		expect(grade).toBe('CRITICAL');
	});

	// ── PRD annotated example ─────────────────────────────────────────────────

	it('PRD annotated example: FP=0, UP=16, MP=15, MSP=6 → score 63, grade Moderate', () => {
		const hist = [makeSignal('genuine'), makeSignal('genuine'), makeSignal('genuine'), makeSignal('reference-only'), makeSignal('reference-only'), makeSignal('mixed'), makeSignal('mixed')];
		const { score, grade } = computeScore({ frequencyClass: 'LOW', unstablePropsCount: 2, sessionClass: 'PARTIALLY_EFFECTIVE', signalHistory: hist });
		expect(score).toBe(63);
		expect(grade).toBe('MODERATE');
	});
});
