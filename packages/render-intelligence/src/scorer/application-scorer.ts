import type { HealthGrade } from '@sapanmozammel/render-core-schema';
import type { ComponentAnalysis, ApplicationHealth } from '../types/index.js';

const gradeFromScore = (score: number): HealthGrade => {
	if (score >= 90) return 'EXCELLENT';
	if (score >= 70) return 'GOOD';
	if (score >= 50) return 'MODERATE';
	if (score >= 30) return 'POOR';
	return 'CRITICAL';
};

export const scoreApplication = (
	components: readonly ComponentAnalysis[],
	source: 'snapshot' | 'events' | 'replay',
): ApplicationHealth => {
	if (components.length === 0) {
		return {
			score: 0,
			grade: 'CRITICAL',
			componentCount: 0,
			healthyCount: 0,
			degradedCount: 0,
			criticalCount: 0,
			totalRenders: 0,
			analysisSource: source,
		};
	}

	const totalRenders = components.reduce((sum, c) => sum + c.totalRenders, 0);

	let weightedScore = 0;
	let healthyCount = 0;
	let degradedCount = 0;
	let criticalCount = 0;

	for (const c of components) {
		const weight = totalRenders > 0 ? c.totalRenders / totalRenders : 1 / components.length;
		weightedScore += c.averageScore * weight;

		if (c.averageScore >= 70) healthyCount++;
		else if (c.averageScore >= 30) degradedCount++;
		else criticalCount++;
	}

	const score = Math.round(weightedScore);

	return {
		score,
		grade: gradeFromScore(score),
		componentCount: components.length,
		healthyCount,
		degradedCount,
		criticalCount,
		totalRenders,
		analysisSource: source,
	};
};
