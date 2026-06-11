import type { ReplayFrame, ReplaySessionStats } from '../types/index.js';

export const buildSessionStats = (frames: readonly ReplayFrame[]): ReplaySessionStats => {
	const totalRenders = frames.length;

	const scores = frames.map((f) => f.score).filter((s): s is number => s !== null);
	const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
	const minScore = scores.length > 0 ? Math.min(...scores) : null;
	const maxScore = scores.length > 0 ? Math.max(...scores) : null;

	// first and last frame that have a score
	const firstScoredFrame = frames.find((f) => f.score !== null);
	const lastScoredFrame = [...frames].reverse().find((f) => f.score !== null);
	const initialScore = firstScoredFrame?.score ?? null;
	const finalScore = lastScoredFrame?.score ?? null;
	const scoreDelta = initialScore !== null && finalScore !== null ? finalScore - initialScore : null;

	const ineffectiveRenderCount = frames.filter((f) => f.memoClassification === 'INEFFECTIVE').length;
	const highFrequencyCount = frames.filter((f) => f.frequencyClass === 'HIGH').length;

	// deduplicate unstable prop names across all frames
	const unstablePropSet = new Set<string>();
	for (const frame of frames) {
		if (frame.propChangeEvent !== null) {
			for (const instability of frame.propChangeEvent.unstable) {
				unstablePropSet.add(instability.name);
			}
		}
	}
	const unstablePropNames: readonly string[] = Object.freeze(Array.from(unstablePropSet));

	const totalRecommendations = frames.reduce((sum, f) => sum + f.recommendationCount, 0);

	const recSet = new Set<string>();
	for (const frame of frames) {
		if (frame.recommendationEvent !== null) {
			for (const rec of frame.recommendationEvent.recommendations) {
				recSet.add(rec);
			}
		}
	}
	const uniqueRecommendations: readonly string[] = Object.freeze(Array.from(recSet));

	return Object.freeze<ReplaySessionStats>({
		totalRenders,
		averageScore,
		minScore,
		maxScore,
		initialScore,
		finalScore,
		scoreDelta,
		ineffectiveRenderCount,
		highFrequencyCount,
		unstablePropNames,
		totalRecommendations,
		uniqueRecommendations,
	});
};
