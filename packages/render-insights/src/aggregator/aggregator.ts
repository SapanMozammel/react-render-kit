import { classifyFrequency } from '../classifier/classify-frequency.js';
import { classifyProps } from '../classifier/classify-props.js';
import { classifySession } from '../classifier/classify-session.js';
import { classifySignal } from '../classifier/classify-signal.js';
import { generateRecommendations } from '../recommendations/recommender.js';
import { computeScore } from '../scoring/scorer.js';
import type { FrequencySummary, HealthGrade, InferredTrigger, InsightReport, MemoSummary, RenderSignal } from '../types/index.js';

type AggregatorInput = {
	componentName: string;
	prevProps: Record<string, unknown>;
	currProps: Record<string, unknown>;
	ignoreProps: readonly string[];
	frequencyTimestamps: number[];
	windowMs: number;
	signalHistory: RenderSignal[];
	renderNumber: number;
	reportNumber: number;
};

const inferTrigger = (signal: RenderSignal | null): InferredTrigger => {
	if (signal === null) return 'no-prop-change';
	if (signal.kind === 'genuine') return 'genuine-prop-change';
	if (signal.kind === 'reference-only') return 'reference-instability';
	return 'mixed';
};

export const aggregate = (input: AggregatorInput): InsightReport => {
	const { componentName, prevProps, currProps, ignoreProps, frequencyTimestamps, windowMs, signalHistory, renderNumber, reportNumber } = input;

	// Trim stale timestamps and compute frequency
	const now = Date.now();
	const cutoff = now - windowMs;
	while (frequencyTimestamps.length > 0 && frequencyTimestamps[0] < cutoff) {
		frequencyTimestamps.shift();
	}
	const windowCount = frequencyTimestamps.length;
	const rate = windowCount < 2 ? 0 : windowCount / (windowMs / 1000);
	const frequencyClass = classifyFrequency(windowCount, windowMs);
	const frequency: FrequencySummary = {
		totalRenders: renderNumber,
		windowCount,
		windowMs,
		rate,
		classification: frequencyClass,
	};

	// Prop diff and signal classification
	const propSummary = classifyProps(prevProps, currProps, ignoreProps);
	const signal = classifySignal(propSummary);

	// Signal history update (FIFO, only when signal is non-null)
	if (signal !== null) {
		if (signalHistory.length === 20) signalHistory.shift();
		signalHistory.push(signal);
	}

	// Session classification
	const sessionClass = classifySession(signalHistory);
	const genuineCount = signalHistory.filter((s) => s.kind === 'genuine').length;
	const referenceOnlyCount = signalHistory.filter((s) => s.kind === 'reference-only').length;
	const mixedCount = signalHistory.filter((s) => s.kind === 'mixed').length;
	const memo: MemoSummary = {
		signalKind: signal?.kind ?? null,
		sessionClass,
		genuineCount,
		referenceOnlyCount,
		mixedCount,
	};

	// Scoring
	const unstablePropsCount = propSummary.unstable.length;
	const { score, grade } = computeScore({ frequencyClass, unstablePropsCount, sessionClass, signalHistory });

	// Inferred trigger
	const inferredTrigger = inferTrigger(signal);

	// Recommendations (only meaningful when signal !== null)
	const recommendations = signal !== null ? generateRecommendations({ unstableProps: propSummary.unstable, sessionClass, frequencyClass }) : [];

	return {
		componentName,
		renderNumber,
		reportNumber,
		props: propSummary,
		frequency,
		memo,
		score,
		grade: grade as HealthGrade,
		inferredTrigger,
		recommendations,
	};
};
