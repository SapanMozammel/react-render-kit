/* eslint-disable no-console */
import type { FrequencyClass, HealthGrade, InsightReport, PropChangeEntry } from '../types/index.js';

type LogInsightsParams = {
	report: InsightReport;
	maxReports: number;
	isLastReport: boolean;
	prevProps: Record<string, unknown>;
	currProps: Record<string, unknown>;
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
	if (typeof value === 'function') return '[Function]';
	if (typeof value === 'object') return '[Object]';
	return String(value);
};

const formatGrade = (grade: HealthGrade): string => {
	const map: Record<HealthGrade, string> = {
		EXCELLENT: 'Excellent',
		GOOD: 'Good',
		MODERATE: 'Moderate',
		POOR: 'Poor',
		CRITICAL: 'Critical',
	};
	return map[grade];
};

const printSection = (title: string): void => {
	console.log('');
	console.log(title);
	console.log('-'.repeat(title.length));
};

const printField = (label: string, value: string, pad: number): void => {
	console.log(`  ${label.padEnd(pad)}${value}`);
};

const printRenderHealth = (report: InsightReport): void => {
	const labels = ['Render #', 'Score', 'Grade', 'Inferred Trigger'];
	const pad = Math.max(...labels.map((l) => l.length)) + 2;
	printSection('Render Health');
	printField('Render #', String(report.renderNumber), pad);
	printField('Score', `${report.score} / 100`, pad);
	printField('Grade', formatGrade(report.grade), pad);
	printField('Inferred Trigger', report.inferredTrigger, pad);
};

const printChangedProps = (report: InsightReport, prevProps: Record<string, unknown>, currProps: Record<string, unknown>): void => {
	const entries = report.props.changed;
	if (entries.length === 0) return;

	const pad = Math.max(...entries.map((e) => e.key.length)) + 2;
	printSection('Changed Props');

	for (const entry of entries) {
		const typeLabel = entry.kind === 'removed' ? getValueType(prevProps[entry.key]) : getValueType(currProps[entry.key]);
		let change: string;
		if (entry.kind === 'value-changed') {
			change = `${formatValue((entry as Extract<PropChangeEntry, { kind: 'value-changed' }>).prev)} → ${formatValue((entry as Extract<PropChangeEntry, { kind: 'value-changed' }>).next)}`;
		} else if (entry.kind === 'reference-changed') {
			change = 'new reference';
		} else if (entry.kind === 'added') {
			change = `(none) → ${formatValue((entry as Extract<PropChangeEntry, { kind: 'added' }>).next)}`;
		} else {
			change = `${formatValue((entry as Extract<PropChangeEntry, { kind: 'removed' }>).prev)} → (none)`;
		}
		console.log(`  ${entry.key.padEnd(pad)}  ${typeLabel.padEnd(10)}${change}`);
	}
};

const printUnstableProps = (report: InsightReport): void => {
	const props = report.props.unstable;
	if (props.length === 0) return;

	const pad = Math.max(...props.map((p) => p.name.length)) + 2;
	printSection('Unstable Props');

	for (const { name, type } of props) {
		console.log(`  ${name.padEnd(pad)}  ${type.padEnd(10)}new reference`);
	}
};

const printFrequency = (report: InsightReport): void => {
	const { totalRenders, windowCount, windowMs, rate, classification } = report.frequency;
	const windowLabel = `${Math.round(windowMs / 1000)}s`;
	const labels = ['Total Renders', `Window (${windowLabel})`, 'Rate', 'Class'];
	const pad = Math.max(...labels.map((l) => l.length)) + 2;
	printSection('Render Frequency');
	printField('Total Renders', String(totalRenders), pad);
	printField(`Window (${windowLabel})`, `${windowCount} renders`, pad);
	printField('Rate', `${rate.toFixed(1)} renders/sec`, pad);
	printField('Class', classification, pad);
};

const printMemoEffectiveness = (report: InsightReport): void => {
	const { signalKind, sessionClass, genuineCount, referenceOnlyCount, mixedCount } = report.memo;
	const labels = ['Classification', 'This Render', 'Window'];
	const pad = Math.max(...labels.map((l) => l.length)) + 2;
	printSection('Memo Effectiveness');
	printField('Classification', sessionClass, pad);
	printField('This Render', signalKind ?? 'none', pad);
	printField('Window', `genuine: ${genuineCount}  reference-only: ${referenceOnlyCount}  mixed: ${mixedCount}`, pad);
};

const printRecommendation = (report: InsightReport): void => {
	printSection('Recommendation');
	for (const rec of report.recommendations) {
		console.log(`  ${rec}`);
	}
};

const printFooter = (reportCount: number, maxReports: number, isLastReport: boolean): void => {
	console.log('');
	if (isLastReport) {
		console.log(`[report ${reportCount} / ${maxReports} — further reports suppressed — score:v1]`);
	} else {
		console.log(`[report ${reportCount} / ${maxReports} — score:v1]`);
	}
};

export const logInsights = (params: LogInsightsParams): void => {
	const { report, maxReports, isLastReport, prevProps, currProps } = params;

	console.groupCollapsed(`[render-insights] <${report.componentName}>`);

	printRenderHealth(report);
	printChangedProps(report, prevProps, currProps);
	printUnstableProps(report);
	printFrequency(report);
	printMemoEffectiveness(report);
	printRecommendation(report);
	printFooter(report.reportNumber, maxReports, isLastReport);

	console.groupEnd();
};

export const logNoChange = (componentName: string, renderNumber: number, frequencyClass: FrequencyClass): void => {
	console.log(`[render-insights] <${componentName}> — no prop changes detected (render #${renderNumber}, ${frequencyClass})`);
};

export const logFrequencyOneLiner = (componentName: string, renderNumber: number, frequencyClass: FrequencyClass, rate: number): void => {
	console.log(`[render-insights] <${componentName}> — render #${renderNumber}, ${frequencyClass} (${rate.toFixed(1)} renders/sec)`);
};
