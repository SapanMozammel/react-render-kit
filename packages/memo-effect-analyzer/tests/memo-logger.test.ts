/* eslint-disable no-console */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logAnalysis, logNoChange } from '../src/logger/memo-logger';
import type { RenderSignal } from '../src/types/index';

const makeSignal = (override: Partial<RenderSignal> = {}): RenderSignal => ({
	kind: 'reference-only',
	genuineKeys: [],
	unstableProps: [{ name: 'fn', type: 'function' }],
	...override,
});

const defaultParams = {
	componentName: 'UserCard',
	sessionClass: 'INEFFECTIVE' as const,
	signalCounts: { genuine: 0, referenceOnly: 1, mixed: 0 },
	renderNumber: 2,
	reportCount: 1,
	maxReports: 10,
	isLastReport: false,
	prev: { fn: () => {} },
	curr: { fn: () => {} },
};

describe('logAnalysis', () => {
	beforeEach(() => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('calls console.groupCollapsed exactly once per invocation', () => {
		logAnalysis({ ...defaultParams, signal: makeSignal() });
		expect(console.groupCollapsed).toHaveBeenCalledOnce();
	});

	it('calls console.groupEnd exactly once per invocation', () => {
		logAnalysis({ ...defaultParams, signal: makeSignal() });
		expect(console.groupEnd).toHaveBeenCalledOnce();
	});

	it('header contains component name', () => {
		logAnalysis({ ...defaultParams, signal: makeSignal() });
		expect(console.groupCollapsed).toHaveBeenCalledWith('[memo-effect-analyzer] <UserCard>');
	});

	it('output contains INEFFECTIVE classification label', () => {
		logAnalysis({ ...defaultParams, signal: makeSignal() });
		const allLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(allLog).toContain('INEFFECTIVE');
	});

	it('output contains EFFECTIVE classification label', () => {
		logAnalysis({
			...defaultParams,
			signal: makeSignal({ kind: 'genuine', genuineKeys: ['name'], unstableProps: [] }),
			sessionClass: 'EFFECTIVE',
			signalCounts: { genuine: 1, referenceOnly: 0, mixed: 0 },
		});
		const allLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(allLog).toContain('EFFECTIVE');
	});

	it('output contains PARTIALLY_EFFECTIVE classification label', () => {
		logAnalysis({
			...defaultParams,
			signal: makeSignal({
				kind: 'mixed',
				genuineKeys: ['name'],
				unstableProps: [{ name: 'cfg', type: 'object' }],
			}),
			sessionClass: 'PARTIALLY_EFFECTIVE',
			signalCounts: { genuine: 1, referenceOnly: 0, mixed: 1 },
			prev: { name: 'Alice', cfg: {} },
			curr: { name: 'Bob', cfg: {} },
		});
		const allLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(allLog).toContain('PARTIALLY_EFFECTIVE');
	});

	it('genuine signal: Genuine Changes section present with key name', () => {
		logAnalysis({
			...defaultParams,
			signal: makeSignal({ kind: 'genuine', genuineKeys: ['name'], unstableProps: [] }),
			sessionClass: 'EFFECTIVE',
			signalCounts: { genuine: 1, referenceOnly: 0, mixed: 0 },
			prev: { name: 'Alice' },
			curr: { name: 'Bob' },
		});
		const allLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(allLog).toContain('Genuine Changes');
		expect(allLog).toContain('name');
		expect(allLog).toContain('"Alice"');
		expect(allLog).toContain('"Bob"');
	});

	it('reference-only signal: Reference Instability section present with key name, type, "new reference"', () => {
		logAnalysis({ ...defaultParams, signal: makeSignal() });
		const allLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(allLog).toContain('Reference Instability');
		expect(allLog).toContain('fn');
		expect(allLog).toContain('function');
		expect(allLog).toContain('new reference');
	});

	it('mixed signal: both Genuine Changes and Reference Instability sections present', () => {
		logAnalysis({
			...defaultParams,
			signal: makeSignal({
				kind: 'mixed',
				genuineKeys: ['count'],
				unstableProps: [{ name: 'fn', type: 'function' }],
			}),
			sessionClass: 'PARTIALLY_EFFECTIVE',
			signalCounts: { genuine: 0, referenceOnly: 0, mixed: 1 },
			prev: { count: 1, fn: () => {} },
			curr: { count: 2, fn: () => {} },
		});
		const allLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(allLog).toContain('Genuine Changes');
		expect(allLog).toContain('Reference Instability');
	});

	it('report counter format: [report N / M]', () => {
		logAnalysis({ ...defaultParams, signal: makeSignal(), reportCount: 3 });
		const allLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(allLog).toContain('[report 3 / 10]');
	});

	it('suppression notice on final report', () => {
		logAnalysis({ ...defaultParams, signal: makeSignal(), reportCount: 10, isLastReport: true });
		const allLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(allLog).toContain('further reports suppressed');
		expect(allLog).toContain('[report 10 / 10 — further reports suppressed for this instance]');
	});

	it('no suppression notice on non-final report', () => {
		logAnalysis({ ...defaultParams, signal: makeSignal(), reportCount: 5, isLastReport: false });
		const allLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
		expect(allLog).not.toContain('suppressed');
	});
});

describe('logNoChange', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('calls console.log exactly once', () => {
		logNoChange('UserCard');
		expect(console.log).toHaveBeenCalledOnce();
	});

	it('output contains "no prop changes detected"', () => {
		logNoChange('UserCard');
		expect(console.log).toHaveBeenCalledWith('[memo-effect-analyzer] <UserCard> — no prop changes detected');
	});

	it('does not call console.groupCollapsed', () => {
		logNoChange('UserCard');
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});

	it('does not call console.groupEnd', () => {
		logNoChange('UserCard');
		expect(console.groupEnd).not.toHaveBeenCalled();
	});
});
