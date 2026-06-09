import { renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRenderInsights } from '../src/hook/use-render-insights.js';

beforeEach(() => {
	vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
	vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

// ── Path 2 — enabled: false ────────────────────────────────────────────────

describe('Path 2 — disabled', () => {
	it('no console output when enabled: false', () => {
		const props = { a: 1 };
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { enabled: false }), { initialProps: { p: props } });
		rerender({ p: { a: 2 } });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});

	it('re-enable after disabled renders: compares against last enabled snapshot', () => {
		let enabled = false;
		const { rerender } = renderHook(({ p, en }) => useRenderInsights('C', p, { enabled: en }), {
			initialProps: { p: { a: 1 }, en: true },
		});
		// First render: baseline
		rerender({ p: { a: 2 }, en: false }); // disabled
		rerender({ p: { a: 3 }, en: false }); // still disabled
		rerender({ p: { a: 4 }, en: true });  // re-enabled, compares against a:1 baseline? No — against last enabled value
		// After re-enable, a: 4 vs a: 1 → change detected
		expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
		void enabled;
	});
});

// ── Path 3 — first render ──────────────────────────────────────────────────

describe('Path 3 — first render', () => {
	it('no console output on mount', () => {
		renderHook(() => useRenderInsights('C', { a: 1 }));
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});
});

// ── Path 4 — null signal ───────────────────────────────────────────────────

describe('Path 4 — null signal', () => {
	it('no console output when logOnEveryRender: false', () => {
		const stableProps = { a: 1 };
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p), { initialProps: { p: stableProps } });
		rerender({ p: stableProps }); // same reference — no signal
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});

	it('console.log called once when logOnEveryRender: true; groupCollapsed NOT called', () => {
		const stableProps = { a: 1 };
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { logOnEveryRender: true }), { initialProps: { p: stableProps } });
		rerender({ p: stableProps }); // same reference
		expect(console.log).toHaveBeenCalledTimes(1);
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});
});

// ── Path 5 — within maxReports ────────────────────────────────────────────

describe('Path 5 — within maxReports', () => {
	it('primitive changed → groupCollapsed called, output contains score', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p), { initialProps: { p: { a: 1 } } });
		rerender({ p: { a: 2 } });
		expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
		const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(logCalls.some((c) => c.includes('/ 100'))).toBe(true);
	});

	it('function reference changed → INEFFECTIVE session eventually after repeated renders', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p), { initialProps: { p: { fn: () => {} } } });
		rerender({ p: { fn: () => {} } });
		const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(logCalls.some((c) => c.includes('INEFFECTIVE') || c.includes('reference-only'))).toBe(true);
	});

	it('object reference changed → outputs reference-related content', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p), { initialProps: { p: { obj: { x: 1 } } } });
		rerender({ p: { obj: { x: 1 } } });
		expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
	});

	it('mixed change (primitive + reference) → PARTIALLY_EFFECTIVE or mixed signal', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p), { initialProps: { p: { a: 1, fn: () => {} } } });
		rerender({ p: { a: 2, fn: () => {} } });
		expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
		const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(logCalls.some((c) => c.includes('mixed') || c.includes('PARTIALLY_EFFECTIVE'))).toBe(true);
	});

	it('maxReports = 3, 5 renders → groupCollapsed called exactly 3 times', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { maxReports: 3 }), { initialProps: { p: { a: 0 } } });
		for (let i = 1; i <= 5; i++) rerender({ p: { a: i } });
		expect(console.groupCollapsed).toHaveBeenCalledTimes(3);
	});

	it('onReport callback invoked with InsightReport on Path 5', () => {
		const onReport = vi.fn();
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { onReport }), { initialProps: { p: { a: 1 } } });
		rerender({ p: { a: 2 } });
		expect(onReport).toHaveBeenCalledTimes(1);
		expect(onReport.mock.calls[0][0]).toMatchObject({ componentName: 'C', score: expect.any(Number) });
	});

	it('onReport not called on Path 4 (no-change render)', () => {
		const onReport = vi.fn();
		const stableProps = { a: 1 };
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { onReport }), { initialProps: { p: stableProps } });
		rerender({ p: stableProps });
		expect(onReport).not.toHaveBeenCalled();
	});

	it('onReport error is caught and logged to console.error', () => {
		const onReport = () => { throw new Error('oops'); };
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { onReport }), { initialProps: { p: { a: 1 } } });
		rerender({ p: { a: 2 } });
		expect(console.error).toHaveBeenCalled();
	});
});

// ── Path 6 — maxReports exhausted ─────────────────────────────────────────

describe('Path 6 — maxReports exhausted', () => {
	it('signal window still updates after maxReports', () => {
		const onReport = vi.fn();
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { maxReports: 1, onReport }), { initialProps: { p: { a: 0 } } });
		rerender({ p: { a: 1 } }); // report #1 — last report
		rerender({ p: { a: 2 } }); // Path 6 — no log but window updates
		expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
		expect(onReport).toHaveBeenCalledTimes(1); // only called on Path 5
	});

	it('suppression notice appears on report #maxReports', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { maxReports: 2 }), { initialProps: { p: { a: 0 } } });
		rerender({ p: { a: 1 } }); // report #1
		vi.clearAllMocks();
		rerender({ p: { a: 2 } }); // report #2 — last
		const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(logCalls.some((c) => c.includes('further reports suppressed'))).toBe(true);
	});
});

// ── StrictMode ─────────────────────────────────────────────────────────────

describe('StrictMode', () => {
	it('Group A: stable external props → 0 groupCollapsed calls after mount', () => {
		const stableProps = { a: 1 };
		renderHook(() => useRenderInsights('C', stableProps), { wrapper: React.StrictMode });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});

	it('Group B: inline reference props → exactly 1 groupCollapsed call after mount', () => {
		renderHook(() => useRenderInsights('C', { fn: () => {} }), { wrapper: React.StrictMode });
		expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
	});
});

// ── ignoreProps ────────────────────────────────────────────────────────────

describe('ignoreProps', () => {
	it('ignored key change → no signal, no log', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { ignoreProps: ['fn'] }), {
			initialProps: { p: { fn: () => {} } },
		});
		rerender({ p: { fn: () => {} } });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});

	it('ignored reference key + non-ignored primitive key → genuine signal logged', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { ignoreProps: ['fn'] }), {
			initialProps: { p: { fn: () => {}, count: 1 } },
		});
		rerender({ p: { fn: () => {}, count: 2 } });
		expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
		const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(logCalls.some((c) => c.includes('genuine'))).toBe(true);
	});
});

// ── Frequency ──────────────────────────────────────────────────────────────

describe('Frequency tracking', () => {
	it('after multiple rapid re-renders, frequency section exists in output', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { frequencyWindowMs: 10000 }), { initialProps: { p: { a: 0 } } });
		for (let i = 1; i <= 5; i++) rerender({ p: { a: i } });
		const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(logCalls.some((c) => c === 'Render Frequency')).toBe(true);
	});
});

// ── Score ──────────────────────────────────────────────────────────────────

describe('Score', () => {
	it('after a reference-only render, score < 100', () => {
		const onReport = vi.fn();
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { onReport }), { initialProps: { p: { fn: () => {} } } });
		rerender({ p: { fn: () => {} } });
		expect(onReport.mock.calls[0][0].score).toBeLessThan(100);
	});
});

// ── Added / Removed props ─────────────────────────────────────────────────

describe('Added and removed props', () => {
	it('added prop detected as genuine signal', () => {
		const onReport = vi.fn();
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { onReport }), { initialProps: { p: { a: 1 } as Record<string, unknown> } });
		rerender({ p: { a: 1, b: 2 } });
		expect(onReport).toHaveBeenCalledTimes(1);
		expect(onReport.mock.calls[0][0].memo.signalKind).toBe('genuine');
	});

	it('removed prop detected as genuine signal', () => {
		const onReport = vi.fn();
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { onReport }), { initialProps: { p: { a: 1, b: 2 } as Record<string, unknown> } });
		rerender({ p: { a: 1 } });
		expect(onReport).toHaveBeenCalledTimes(1);
		expect(onReport.mock.calls[0][0].memo.signalKind).toBe('genuine');
	});
});

// ── Session accumulation ──────────────────────────────────────────────────

describe('Session accumulation', () => {
	it('N genuine-only renders → EFFECTIVE session', () => {
		const onReport = vi.fn();
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { onReport }), { initialProps: { p: { a: 0 } } });
		for (let i = 1; i <= 5; i++) rerender({ p: { a: i } });
		const lastReport = onReport.mock.calls.at(-1)![0];
		expect(lastReport.memo.sessionClass).toBe('EFFECTIVE');
	});
});

// ── maxReports: 0 ─────────────────────────────────────────────────────────

describe('maxReports: 0', () => {
	it('silences all output when maxReports = 0', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { maxReports: 0 }), { initialProps: { p: { a: 1 } } });
		rerender({ p: { a: 2 } });
		rerender({ p: { a: 3 } });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});
});

// ── frequencyLogEvery ─────────────────────────────────────────────────────

describe('frequencyLogEvery', () => {
	it('fires on every Nth render in Path 4', () => {
		const stableProps = { a: 1 };
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { frequencyLogEvery: 2 }), { initialProps: { p: stableProps } });
		// Each rerender with same ref → Path 4
		rerender({ p: stableProps });
		rerender({ p: stableProps });
		rerender({ p: stableProps });
		// renderCount increments each rerender: 2nd render → count=2 (fires), 3rd → count=3 (no), 4th → count=4 (fires)
		const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(logCalls.some((c) => c.includes('renders/sec'))).toBe(true);
	});

	it('does NOT fire when frequencyLogEvery = 0 (default)', () => {
		const stableProps = { a: 1 };
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p, { frequencyLogEvery: 0 }), { initialProps: { p: stableProps } });
		rerender({ p: stableProps });
		rerender({ p: stableProps });
		const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
		expect(logCalls.some((c) => c.includes('renders/sec'))).toBe(false);
	});
});
