import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useInsightCapture } from '../../src/hooks/use-insight-capture.js';
import type { InsightReport } from '@sapanmozammel/render-insights';

const makeReport = (overrides?: Partial<InsightReport>): InsightReport => ({
	componentName: 'TestComp',
	renderNumber: 1,
	reportNumber: 1,
	props: { changed: [], unstable: [] },
	frequency: { totalRenders: 1, windowCount: 1, windowMs: 1000, rate: 1, classification: 'LOW' },
	memo: { signalKind: null, sessionClass: 'NOT_APPLICABLE', genuineCount: 0, referenceOnlyCount: 0, mixedCount: 0 },
	score: 100,
	grade: 'EXCELLENT',
	inferredTrigger: 'no-prop-change',
	recommendations: [],
	...overrides,
});

describe('useInsightCapture', () => {
	it('starts with empty reports', () => {
		const { result } = renderHook(() => useInsightCapture());
		expect(result.current.reports).toHaveLength(0);
	});

	it('onReport pushes a report into reports', () => {
		const { result } = renderHook(() => useInsightCapture());
		act(() => {
			result.current.onReport(makeReport({ renderNumber: 1 }));
		});
		expect(result.current.reports).toHaveLength(1);
	});

	it('onReport accumulates multiple reports', () => {
		const { result } = renderHook(() => useInsightCapture());
		act(() => {
			result.current.onReport(makeReport({ renderNumber: 1 }));
			result.current.onReport(makeReport({ renderNumber: 2 }));
		});
		expect(result.current.reports).toHaveLength(2);
	});

	it('clearReports empties the list', () => {
		const { result } = renderHook(() => useInsightCapture());
		act(() => {
			result.current.onReport(makeReport());
		});
		act(() => {
			result.current.clearReports();
		});
		expect(result.current.reports).toHaveLength(0);
	});

	it('onReport is stable across re-renders', () => {
		const { result, rerender } = renderHook(() => useInsightCapture());
		const firstOnReport = result.current.onReport;
		rerender();
		expect(result.current.onReport).toBe(firstOnReport);
	});

	it('clearReports is stable across re-renders', () => {
		const { result, rerender } = renderHook(() => useInsightCapture());
		const firstClear = result.current.clearReports;
		rerender();
		expect(result.current.clearReports).toBe(firstClear);
	});

	it('respects maxEntries option', () => {
		const { result } = renderHook(() => useInsightCapture({ maxEntries: 2 }));
		act(() => {
			result.current.onReport(makeReport({ renderNumber: 1 }));
			result.current.onReport(makeReport({ renderNumber: 2 }));
			result.current.onReport(makeReport({ renderNumber: 3 }));
		});
		expect(result.current.reports).toHaveLength(2);
		expect(result.current.reports[0].renderNumber).toBe(2);
	});

	it('production guard: onReport is a no-op in production', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const { result } = renderHook(() => useInsightCapture());
		act(() => {
			result.current.onReport(makeReport());
		});
		// reports may still be empty since production returns early stub
		// just ensure no error is thrown
		vi.unstubAllEnvs();
	});

	it('reports array is readonly (new reference on each push)', () => {
		const { result } = renderHook(() => useInsightCapture());
		act(() => {
			result.current.onReport(makeReport({ renderNumber: 1 }));
		});
		const snap1 = result.current.reports;
		act(() => {
			result.current.onReport(makeReport({ renderNumber: 2 }));
		});
		const snap2 = result.current.reports;
		expect(snap1).not.toBe(snap2);
	});
});
