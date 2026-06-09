import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logFrequencyOneLiner, logInsights, logNoChange } from '../src/logger/insights-logger.js';
import type { InsightReport } from '../src/types/index.js';

const makeReport = (overrides: Partial<InsightReport> = {}): InsightReport => ({
	componentName: 'TestComp',
	renderNumber: 5,
	reportNumber: 2,
	props: { changed: [], unstable: [] },
	frequency: { totalRenders: 5, windowCount: 3, windowMs: 10000, rate: 0.3, classification: 'LOW' },
	memo: { signalKind: null, sessionClass: 'NOT_APPLICABLE', genuineCount: 0, referenceOnlyCount: 0, mixedCount: 0 },
	score: 100,
	grade: 'EXCELLENT',
	inferredTrigger: 'no-prop-change',
	recommendations: ['Component is well-optimized. All observed re-renders are data-driven.'],
	...overrides,
});

describe('logInsights', () => {
	beforeEach(() => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});
	afterEach(() => vi.restoreAllMocks());

	it('calls console.groupCollapsed exactly once', () => {
		logInsights({ report: makeReport(), maxReports: 10, isLastReport: false, prevProps: {}, currProps: {} });
		expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
	});

	it('calls console.groupEnd exactly once', () => {
		logInsights({ report: makeReport(), maxReports: 10, isLastReport: false, prevProps: {}, currProps: {} });
		expect(console.groupEnd).toHaveBeenCalledTimes(1);
	});

	it('header format: [render-insights] <ComponentName>', () => {
		logInsights({ report: makeReport(), maxReports: 10, isLastReport: false, prevProps: {}, currProps: {} });
		expect(console.groupCollapsed).toHaveBeenCalledWith('[render-insights] <TestComp>');
	});

	it('Render Health section appears with render number', () => {
		logInsights({ report: makeReport({ renderNumber: 37 }), maxReports: 10, isLastReport: false, prevProps: {}, currProps: {} });
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(calls.some((c) => c.includes('Render Health'))).toBe(true);
		expect(calls.some((c) => c.includes('37'))).toBe(true);
	});

	it('score and grade appear in Render Health section', () => {
		logInsights({ report: makeReport({ score: 72, grade: 'GOOD' }), maxReports: 10, isLastReport: false, prevProps: {}, currProps: {} });
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(calls.some((c) => c.includes('72 / 100'))).toBe(true);
		expect(calls.some((c) => c.includes('Good'))).toBe(true);
	});

	it('Changed Props section omitted when changed.length === 0', () => {
		logInsights({ report: makeReport({ props: { changed: [], unstable: [] } }), maxReports: 10, isLastReport: false, prevProps: {}, currProps: {} });
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(calls.some((c) => c === 'Changed Props')).toBe(false);
	});

	it('Changed Props section present when changed.length > 0', () => {
		const report = makeReport({
			props: { changed: [{ kind: 'value-changed', key: 'label', prev: 'a', next: 'b' }], unstable: [] },
			inferredTrigger: 'genuine-prop-change',
		});
		logInsights({ report, maxReports: 10, isLastReport: false, prevProps: { label: 'a' }, currProps: { label: 'b' } });
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(calls.some((c) => c === 'Changed Props')).toBe(true);
	});

	it('Unstable Props section omitted when unstable.length === 0', () => {
		logInsights({ report: makeReport(), maxReports: 10, isLastReport: false, prevProps: {}, currProps: {} });
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(calls.some((c) => c === 'Unstable Props')).toBe(false);
	});

	it('Unstable Props section present when unstable.length > 0', () => {
		const report = makeReport({ props: { changed: [{ kind: 'reference-changed', key: 'fn', refType: 'function' }], unstable: [{ name: 'fn', type: 'function' }] } });
		logInsights({ report, maxReports: 10, isLastReport: false, prevProps: { fn: () => {} }, currProps: { fn: () => {} } });
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(calls.some((c) => c === 'Unstable Props')).toBe(true);
	});

	it('report footer contains [report N / M — score:v1]', () => {
		logInsights({ report: makeReport({ reportNumber: 3 }), maxReports: 10, isLastReport: false, prevProps: {}, currProps: {} });
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(calls.some((c) => c.includes('[report 3 / 10 — score:v1]'))).toBe(true);
	});

	it('suppression notice when isLastReport: true', () => {
		logInsights({ report: makeReport({ reportNumber: 10 }), maxReports: 10, isLastReport: true, prevProps: {}, currProps: {} });
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(calls.some((c) => c.includes('further reports suppressed'))).toBe(true);
	});

	it('section ordering: Render Health before Render Frequency before Memo Effectiveness', () => {
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
		logInsights({ report: makeReport(), maxReports: 10, isLastReport: false, prevProps: {}, currProps: {} });
		const sections = calls.map((c) => String(c[0])).filter((c) => ['Render Health', 'Render Frequency', 'Memo Effectiveness', 'Recommendation'].includes(c));
		expect(sections.indexOf('Render Health')).toBeLessThan(sections.indexOf('Render Frequency'));
		expect(sections.indexOf('Render Frequency')).toBeLessThan(sections.indexOf('Memo Effectiveness'));
	});

	it('alignment: Render Health section uses padded labels', () => {
		logInsights({ report: makeReport({ renderNumber: 10, inferredTrigger: 'genuine-prop-change' }), maxReports: 10, isLastReport: false, prevProps: {}, currProps: {} });
		const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		const renderLine = calls.find((c) => c.includes('Render #'));
		const triggerLine = calls.find((c) => c.includes('Inferred Trigger'));
		expect(renderLine).toBeDefined();
		expect(triggerLine).toBeDefined();
		// Both should start with '  ' and have consistent alignment
		expect(renderLine!.startsWith('  ')).toBe(true);
		expect(triggerLine!.startsWith('  ')).toBe(true);
	});
});

describe('logNoChange', () => {
	beforeEach(() => { vi.spyOn(console, 'log').mockImplementation(() => {}); });
	afterEach(() => vi.restoreAllMocks());

	it('calls console.log exactly once', () => {
		logNoChange('TestComp', 5, 'LOW');
		expect(console.log).toHaveBeenCalledTimes(1);
	});

	it('does NOT call console.groupCollapsed', () => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		logNoChange('TestComp', 5, 'LOW');
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});

	it('output contains "no prop changes detected"', () => {
		logNoChange('TestComp', 5, 'LOW');
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('no prop changes detected'));
	});

	it('output includes render number and frequency class', () => {
		logNoChange('UserCard', 12, 'MODERATE');
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('render #12'));
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('MODERATE'));
	});
});

describe('logFrequencyOneLiner', () => {
	beforeEach(() => { vi.spyOn(console, 'log').mockImplementation(() => {}); });
	afterEach(() => vi.restoreAllMocks());

	it('output contains render number', () => {
		logFrequencyOneLiner('Comp', 20, 'HIGH', 12.5);
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('render #20'));
	});

	it('output contains frequency class', () => {
		logFrequencyOneLiner('Comp', 20, 'HIGH', 12.5);
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('HIGH'));
	});

	it('output contains rate with 1 decimal place', () => {
		logFrequencyOneLiner('Comp', 20, 'HIGH', 12.5);
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('12.5'));
	});
});
