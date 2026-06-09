import type { FrequencyClass, HealthGrade, MemoClassification, RenderSignal } from '../types/index.js';

type ScoringInputs = {
	frequencyClass: FrequencyClass;
	unstablePropsCount: number;
	sessionClass: MemoClassification;
	signalHistory: readonly RenderSignal[];
};

const fp = (frequencyClass: FrequencyClass): number => {
	if (frequencyClass === 'HIGH') return 25;
	if (frequencyClass === 'MODERATE') return 10;
	return 0;
};

const up = (unstablePropsCount: number): number => Math.min(unstablePropsCount * 8, 30);

const mp = (sessionClass: MemoClassification): number => {
	if (sessionClass === 'INEFFECTIVE') return 30;
	if (sessionClass === 'PARTIALLY_EFFECTIVE') return 15;
	return 0;
};

const msp = (signalHistory: readonly RenderSignal[]): number => {
	const mixedCount = signalHistory.filter((s) => s.kind === 'mixed').length;
	return Math.min(mixedCount * 3, 15);
};

const gradeFromScore = (score: number): HealthGrade => {
	if (score >= 90) return 'EXCELLENT';
	if (score >= 70) return 'GOOD';
	if (score >= 50) return 'MODERATE';
	if (score >= 30) return 'POOR';
	return 'CRITICAL';
};

export const computeScore = (inputs: ScoringInputs): { score: number; grade: HealthGrade } => {
	const score = Math.max(0, Math.min(100, 100 - fp(inputs.frequencyClass) - up(inputs.unstablePropsCount) - mp(inputs.sessionClass) - msp(inputs.signalHistory)));
	return { score, grade: gradeFromScore(score) };
};
