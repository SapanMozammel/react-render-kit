export type HealthGrade = 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | 'CRITICAL';

export type ScoreBreakdown = {
	readonly total: number;
	readonly frequencyPenalty: number;
	readonly instabilityPenalty: number;
	readonly memoPenalty: number;
	readonly mixedSignalPenalty: number;
};
