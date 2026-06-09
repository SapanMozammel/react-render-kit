import { useRef } from 'react';
import { aggregate } from '../aggregator/aggregator.js';
import { logFrequencyOneLiner, logInsights, logNoChange } from '../logger/insights-logger.js';
import type { RenderInsightsOptions, RenderSignal } from '../types/index.js';

export const useRenderInsights = (
	componentName: string,
	props: Record<string, unknown>,
	options?: RenderInsightsOptions,
): void => {
	// INV-REFS: all five refs unconditionally before any early return
	const prevPropsRef = useRef<Record<string, unknown> | null>(null);
	const renderCountRef = useRef(0);
	const signalHistoryRef = useRef<RenderSignal[]>([]);
	const reportCountRef = useRef(0);
	const frequencyTimestampsRef = useRef<number[]>([]);

	// Path 1 — production guard
	if (process.env.NODE_ENV !== 'development') return;

	const {
		enabled = true,
		ignoreProps = [],
		maxReports = 10,
		logOnEveryRender = false,
		frequencyWindowMs = 10000,
		frequencyLogEvery = 0,
		onReport,
	} = options ?? {};

	// Path 2 — disabled guard
	if (!enabled) return;

	renderCountRef.current += 1;
	frequencyTimestampsRef.current.push(Date.now());

	const prev = prevPropsRef.current;

	// Path 3 — first render baseline
	if (prev === null) {
		prevPropsRef.current = props;
		return;
	}

	const windowMs = Math.max(frequencyWindowMs, 1);
	const report = aggregate({
		componentName,
		prevProps: prev,
		currProps: props,
		ignoreProps,
		frequencyTimestamps: frequencyTimestampsRef.current,
		windowMs,
		signalHistory: signalHistoryRef.current,
		renderNumber: renderCountRef.current,
		reportNumber: reportCountRef.current + 1,
	});

	// Path 4 — null signal (no prop changes)
	if (report.inferredTrigger === 'no-prop-change') {
		if (logOnEveryRender) {
			logNoChange(componentName, renderCountRef.current, report.frequency.classification);
		}
		if (frequencyLogEvery > 0 && renderCountRef.current % frequencyLogEvery === 0) {
			logFrequencyOneLiner(componentName, renderCountRef.current, report.frequency.classification, report.frequency.rate);
		}
		prevPropsRef.current = props;
		return;
	}

	// Path 5 — signal within maxReports
	if (reportCountRef.current < maxReports) {
		reportCountRef.current += 1;
		const isLastReport = reportCountRef.current === maxReports;

		logInsights({
			report: { ...report, reportNumber: reportCountRef.current },
			maxReports,
			isLastReport,
			prevProps: prev,
			currProps: props,
		});

		try {
			onReport?.({ ...report, reportNumber: reportCountRef.current });
		} catch {
			console.error('[render-insights] onReport callback threw an error');
		}

		prevPropsRef.current = props;
		return;
	}

	// Path 6 — maxReports exhausted; signal accumulated, no log
	if (frequencyLogEvery > 0 && renderCountRef.current % frequencyLogEvery === 0) {
		logFrequencyOneLiner(componentName, renderCountRef.current, report.frequency.classification, report.frequency.rate);
	}

	prevPropsRef.current = props;
};
