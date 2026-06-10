import type { InsightReport, InferredTrigger } from '@sapanmozammel/render-insights';
import type { SessionStats, ScoreTrend } from '../types/index.js';

const computeTrend = (first: number[], second: number[]): ScoreTrend => {
	if (first.length === 0 || second.length === 0) return 'stable';
	const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
	const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
	const delta = avgSecond - avgFirst;
	if (delta > 5) return 'improving';
	if (delta < -5) return 'degrading';
	return 'stable';
};

const computeMemoTrend = (window: readonly InsightReport[]): ScoreTrend => {
	if (window.length < 2) return 'stable';
	const mid = Math.floor(window.length / 2);
	const firstHalf = window.slice(0, mid);
	const secondHalf = window.slice(mid);

	const badRate = (items: readonly InsightReport[]) => {
		const bad = items.filter((r) => r.memo.sessionClass === 'INEFFECTIVE' || r.memo.sessionClass === 'PARTIALLY_EFFECTIVE').length;
		return bad / items.length;
	};

	const delta = badRate(secondHalf) - badRate(firstHalf);
	if (delta < -0.2) return 'improving';
	if (delta > 0.2) return 'degrading';
	return 'stable';
};

export const computeSessionStats = (history: readonly InsightReport[], windowSize = 20): SessionStats => {
	if (history.length === 0) {
		return {
			windowSize: 0,
			mostFrequentTrigger: 'no-prop-change',
			mostUnstableProp: null,
			mostUnstablePropOccurrences: 0,
			scoreTrend: 'stable',
			memoTrend: 'stable',
			averageScore: 0,
			worstScore: 0,
			bestScore: 0,
		};
	}

	const window = history.slice(-windowSize);

	// Most frequent trigger
	const triggerCounts = new Map<InferredTrigger, number>();
	for (const r of window) {
		triggerCounts.set(r.inferredTrigger, (triggerCounts.get(r.inferredTrigger) ?? 0) + 1);
	}
	let mostFrequentTrigger: InferredTrigger = 'no-prop-change';
	let maxTriggerCount = 0;
	for (const [trigger, count] of triggerCounts) {
		if (count > maxTriggerCount) {
			maxTriggerCount = count;
			mostFrequentTrigger = trigger;
		}
	}

	// Most unstable prop
	const propCounts = new Map<string, number>();
	for (const r of window) {
		for (const p of r.props.unstable) {
			propCounts.set(p.name, (propCounts.get(p.name) ?? 0) + 1);
		}
	}
	let mostUnstableProp: string | null = null;
	let mostUnstablePropOccurrences = 0;
	for (const [name, count] of propCounts) {
		if (count > mostUnstablePropOccurrences) {
			mostUnstablePropOccurrences = count;
			mostUnstableProp = name;
		}
	}

	// Score stats
	const scores = window.map((r) => r.score);
	const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
	const worstScore = Math.min(...scores);
	const bestScore = Math.max(...scores);

	// Score trend (first half vs second half)
	const mid = Math.floor(window.length / 2);
	const firstHalf = scores.slice(0, mid);
	const secondHalf = scores.slice(mid);
	const scoreTrend = computeTrend(firstHalf, secondHalf);

	const memoTrend = computeMemoTrend(window);

	return {
		windowSize: window.length,
		mostFrequentTrigger,
		mostUnstableProp,
		mostUnstablePropOccurrences,
		scoreTrend,
		memoTrend,
		averageScore,
		worstScore,
		bestScore,
	};
};
