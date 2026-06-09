import { useRef } from 'react';
import { classifyRender, classifySession } from '../classifier/classifier.js';
import { logAnalysis, logNoChange } from '../logger/memo-logger.js';
import type { MemoEffectOptions, RenderSignal } from '../types/index.js';

export const useMemoEffectAnalyzer = (componentName: string, props: Record<string, unknown>, options?: MemoEffectOptions): void => {
	// INV10: all four refs unconditionally before any early return
	const prevPropsRef = useRef<Record<string, unknown> | null>(null);
	const renderCountRef = useRef(0);
	const signalHistoryRef = useRef<RenderSignal[]>([]);
	const reportCountRef = useRef(0);

	// Path 1 — production guard
	if (process.env.NODE_ENV !== 'development') return;

	const { enabled = true, ignoreProps = [], maxReports = 10, logOnEveryRender = false } = options ?? {};

	// Path 2 — disabled guard
	if (!enabled) return;

	const prev = prevPropsRef.current;

	// Path 3 — first render baseline
	if (prev === null) {
		renderCountRef.current += 1;
		prevPropsRef.current = props;
		return;
	}

	renderCountRef.current += 1;
	const renderNumber = renderCountRef.current;

	const signal = classifyRender(prev, props, ignoreProps);

	// Path 4 — null signal (no tracked prop changed)
	if (signal === null) {
		if (logOnEveryRender) {
			logNoChange(componentName);
		}
		prevPropsRef.current = props;
		return;
	}

	// Accumulate signal into FIFO window (Paths 5 and 6)
	const window = signalHistoryRef.current;
	if (window.length === 20) window.shift();
	window.push(signal);

	const sessionClass = classifySession(window);

	const genuineCount = window.filter((s) => s.kind === 'genuine').length;
	const referenceOnlyCount = window.filter((s) => s.kind === 'reference-only').length;
	const mixedCount = window.filter((s) => s.kind === 'mixed').length;

	// Path 5 — within maxReports cap
	if (reportCountRef.current < maxReports) {
		const isLastReport = reportCountRef.current + 1 === maxReports;
		reportCountRef.current += 1;

		logAnalysis({
			componentName,
			signal,
			sessionClass,
			signalCounts: { genuine: genuineCount, referenceOnly: referenceOnlyCount, mixed: mixedCount },
			renderNumber,
			reportCount: reportCountRef.current,
			maxReports,
			isLastReport,
			prev,
			curr: props,
		});
	}
	// Path 6 — maxReports exhausted; signal accumulated, no log

	prevPropsRef.current = props;
};
