/* eslint-disable no-console */
import type { MemoClassification, RenderSignal } from '../types/index.js';

type SignalCounts = { genuine: number; referenceOnly: number; mixed: number };

type LogAnalysisParams = {
	componentName: string;
	signal: RenderSignal;
	sessionClass: MemoClassification;
	signalCounts: SignalCounts;
	renderNumber: number;
	reportCount: number;
	maxReports: number;
	isLastReport: boolean;
	prev: Record<string, unknown>;
	curr: Record<string, unknown>;
};

const getValueType = (value: unknown): string => {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (Array.isArray(value)) return 'array';
	return typeof value;
};

const formatValue = (value: unknown): string => {
	if (typeof value === 'string') return `"${value}"`;
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) return `[Array(${(value as unknown[]).length})]`;
	if (typeof value === 'object') return '[Object]';
	if (typeof value === 'function') return '[Function]';
	return String(value);
};

const buildStabilizeHint = (unstableProps: RenderSignal['unstableProps']): string => {
	if (unstableProps.length === 0) return '';
	const parts = unstableProps.map(({ name, type }) => `${name} with ${type === 'function' ? 'useCallback' : 'useMemo'}`);
	return `  Stabilize ${parts.join(' and ')}.`;
};

export const logAnalysis = ({ componentName, signal, sessionClass, signalCounts, reportCount, maxReports, isLastReport, prev, curr }: LogAnalysisParams): void => {
	console.groupCollapsed(`[memo-effect-analyzer] <${componentName}>`);

	// ── Memo Effectiveness ────────────────────────────────────────────────────
	const effectivenessTitle = 'Memo Effectiveness';
	console.log('');
	console.log(effectivenessTitle);
	console.log('-'.repeat(effectivenessTitle.length));
	console.log(`  Classification    ${sessionClass}`);
	console.log(`  Renders logged    ${reportCount} / ${maxReports}`);

	// ── Signal Summary ────────────────────────────────────────────────────────
	const summaryTitle = 'Signal Summary';
	console.log('');
	console.log(summaryTitle);
	console.log('-'.repeat(summaryTitle.length));
	console.log(`  genuine             ${signalCounts.genuine}`);
	console.log(`  reference-only      ${signalCounts.referenceOnly}`);
	console.log(`  mixed               ${signalCounts.mixed}`);

	// ── Genuine Changes (when this signal has genuine keys) ───────────────────
	if (signal.genuineKeys.length > 0) {
		const genuineTitle = 'Genuine Changes';
		const maxKeyLen = Math.max(...signal.genuineKeys.map((k) => k.length));
		const pad = maxKeyLen + 2;

		console.log('');
		console.log(genuineTitle);
		console.log('-'.repeat(genuineTitle.length));

		for (const key of signal.genuineKeys) {
			const inPrev = key in prev;
			const inCurr = key in curr;
			const typeLabel = inCurr ? getValueType(curr[key]) : getValueType(prev[key]);
			let change: string;
			if (!inPrev) {
				change = `(none) → ${formatValue(curr[key])}`;
			} else if (!inCurr) {
				change = `${formatValue(prev[key])} → (none)`;
			} else {
				change = `${formatValue(prev[key])} → ${formatValue(curr[key])}`;
			}
			console.log(`  ${key.padEnd(pad)}  ${typeLabel.padEnd(10)}${change}`);
		}
	}

	// ── Reference Instability (when this signal has unstable props) ───────────
	if (signal.unstableProps.length > 0) {
		const instabilityTitle = 'Reference Instability';
		const maxKeyLen = Math.max(...signal.unstableProps.map((p) => p.name.length));
		const pad = maxKeyLen + 2;

		console.log('');
		console.log(instabilityTitle);
		console.log('-'.repeat(instabilityTitle.length));

		for (const { name, type } of signal.unstableProps) {
			console.log(`  ${name.padEnd(pad)}  ${type.padEnd(10)}new reference`);
		}
	}

	// ── Recommendation ────────────────────────────────────────────────────────
	const recommendationTitle = 'Recommendation';
	console.log('');
	console.log(recommendationTitle);
	console.log('-'.repeat(recommendationTitle.length));

	if (sessionClass === 'INEFFECTIVE') {
		console.log('  Under current prop stability, React.memo would not skip these re-renders.');
		console.log('  All observed re-renders were driven by reference-type prop changes only.');
		const hint = buildStabilizeHint(signal.unstableProps);
		if (hint) console.log(hint);
	} else if (sessionClass === 'EFFECTIVE') {
		console.log('  All observed re-renders were data-driven — props are compatible with memoization.');
		console.log('  If this component is wrapped in React.memo, it is correctly positioned to skip');
		console.log('  re-renders when props are unchanged.');
	} else if (sessionClass === 'PARTIALLY_EFFECTIVE') {
		console.log('  Some re-renders were data-driven; others were driven by reference instability.');
		const hint = buildStabilizeHint(signal.unstableProps);
		if (hint) console.log(`  ${hint.trim()} to eliminate reference-driven re-renders.`);
		console.log('  Genuine data changes will continue to trigger re-renders as expected.');
	} else {
		console.log('  No re-renders observed yet.');
	}

	// ── Report footer ─────────────────────────────────────────────────────────
	console.log('');
	if (isLastReport) {
		console.log(`[report ${reportCount} / ${maxReports} — further reports suppressed for this instance]`);
	} else {
		console.log(`[report ${reportCount} / ${maxReports}]`);
	}

	console.groupEnd();
};

export const logNoChange = (componentName: string): void => {
	console.log(`[memo-effect-analyzer] <${componentName}> — no prop changes detected`);
};
