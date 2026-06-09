/* eslint-disable no-console */
import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemoEffectAnalyzer } from '../src/hook/use-memo-effect-analyzer';

const makeHook = (componentName: string, options?: Parameters<typeof useMemoEffectAnalyzer>[2]) => (props: Record<string, unknown>) => useMemoEffectAnalyzer(componentName, props, options);

const allLogText = () => (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');

describe('useMemoEffectAnalyzer', () => {
	beforeEach(() => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ── Path 3 — first render ─────────────────────────────────────────────────

	describe('Path 3 — first render', () => {
		it('no console method called on initial mount', () => {
			renderHook(() => useMemoEffectAnalyzer('Comp', { fn: () => {} }));
			expect(console.groupCollapsed).not.toHaveBeenCalled();
			expect(console.log).not.toHaveBeenCalled();
		});
	});

	// ── Path 4 — null signal ─────────────────────────────────────────────────

	describe('Path 4 — stable re-render (null signal)', () => {
		it('no console call when logOnEveryRender: false', () => {
			const fn = () => {};
			const { rerender } = renderHook(makeHook('Comp'), { initialProps: { fn } as Record<string, unknown> });
			rerender({ fn });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
			expect(console.log).not.toHaveBeenCalled();
		});

		it('console.log called once when logOnEveryRender: true, groupCollapsed NOT called', () => {
			const fn = () => {};
			const { rerender } = renderHook(makeHook('Comp', { logOnEveryRender: true }), {
				initialProps: { fn } as Record<string, unknown>,
			});
			rerender({ fn });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
			expect(console.log).toHaveBeenCalledOnce();
			expect(allLogText()).toContain('no prop changes detected');
		});
	});

	// ── Path 5 — signal within maxReports ────────────────────────────────────

	describe('Path 5 — signal produced, within maxReports', () => {
		it('primitive prop changed → groupCollapsed called, output contains EFFECTIVE', () => {
			const { rerender } = renderHook(makeHook('Comp'), {
				initialProps: { count: 1 } as Record<string, unknown>,
			});
			rerender({ count: 2 });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
			expect(allLogText()).toContain('EFFECTIVE');
		});

		it('function reference changed → groupCollapsed called, output contains INEFFECTIVE', () => {
			const { rerender } = renderHook(makeHook('Comp'), {
				initialProps: { fn: () => {} } as Record<string, unknown>,
			});
			rerender({ fn: () => {} });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
			expect(allLogText()).toContain('INEFFECTIVE');
		});

		it('primitive + reference changed in same render → PARTIALLY_EFFECTIVE', () => {
			const { rerender } = renderHook(makeHook('Comp'), {
				initialProps: { count: 1, fn: () => {} } as Record<string, unknown>,
			});
			rerender({ count: 2, fn: () => {} });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
			expect(allLogText()).toContain('PARTIALLY_EFFECTIVE');
		});

		it('render 1 genuine, render 2 reference-only → output after render 2 contains PARTIALLY_EFFECTIVE', () => {
			const fn = () => {};
			const { rerender } = renderHook(makeHook('Comp'), {
				initialProps: { count: 1, fn } as Record<string, unknown>,
			});
			rerender({ count: 2, fn }); // render 1: genuine
			rerender({ count: 2, fn: () => {} }); // render 2: reference-only
			expect(console.groupCollapsed).toHaveBeenCalledTimes(2);
			const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
			const lastGroupLog = logCalls.flat().join(' ');
			expect(lastGroupLog).toContain('PARTIALLY_EFFECTIVE');
		});

		it('N renders all genuine → groupCollapsed called N times; final output contains EFFECTIVE', () => {
			const { rerender } = renderHook(makeHook('Comp'), {
				initialProps: { count: 0 } as Record<string, unknown>,
			});
			for (let i = 1; i <= 5; i++) {
				rerender({ count: i });
			}
			expect(console.groupCollapsed).toHaveBeenCalledTimes(5);
			expect(allLogText()).toContain('EFFECTIVE');
		});
	});

	// ── Path 2 — enabled: false ───────────────────────────────────────────────

	describe('Path 2 — enabled: false', () => {
		it('no signal, no console output when enabled: false', () => {
			const { rerender } = renderHook(makeHook('Comp', { enabled: false }), {
				initialProps: { fn: () => {} } as Record<string, unknown>,
			});
			rerender({ fn: () => {} });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
			expect(console.log).not.toHaveBeenCalled();
		});

		it('re-enable after 3 disabled renders: next render compares against snapshot from before disabling', () => {
			const fn = () => {};
			let enabled = true;
			const { rerender } = renderHook((props: Record<string, unknown>) => useMemoEffectAnalyzer('Comp', props, { enabled }), { initialProps: { fn, count: 0 } as Record<string, unknown> });
			// First render (enabled: true) establishes prevPropsRef = { fn, count: 0 }

			// Disable: 3 re-renders with changing count — Path 2, prevPropsRef frozen
			enabled = false;
			rerender({ fn, count: 1 });
			rerender({ fn, count: 2 });
			rerender({ fn, count: 3 });
			expect(console.groupCollapsed).not.toHaveBeenCalled();

			// Re-enable; prevPropsRef is still { fn, count: 0 } from the initial baseline
			enabled = true;
			rerender({ fn, count: 4 });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
			expect(allLogText()).toContain('EFFECTIVE');
		});
	});

	// ── maxReports cap (Path 5 → Path 6) ─────────────────────────────────────

	describe('maxReports cap', () => {
		it('stops logging after maxReports', () => {
			const { rerender } = renderHook(makeHook('Comp', { maxReports: 3 }), {
				initialProps: { fn: () => {} } as Record<string, unknown>,
			});
			for (let i = 0; i < 5; i++) rerender({ fn: () => {} });
			expect(console.groupCollapsed).toHaveBeenCalledTimes(3);
		});

		it('suppression notice on final grouped entry', () => {
			const { rerender } = renderHook(makeHook('Comp', { maxReports: 2 }), {
				initialProps: { fn: () => {} } as Record<string, unknown>,
			});
			rerender({ fn: () => {} });
			rerender({ fn: () => {} });
			rerender({ fn: () => {} });
			expect(allLogText()).toContain('further reports suppressed');
		});

		it('logOnEveryRender stable lines continue after maxReports cap', () => {
			// Use a variable so we can make the cap render and stable renders
			// reference the same fn identity after the cap
			let currentFn = () => {};
			const { rerender } = renderHook((props: Record<string, unknown>) => useMemoEffectAnalyzer('Comp', props, { maxReports: 1, logOnEveryRender: true }), {
				initialProps: { fn: currentFn } as Record<string, unknown>,
			});
			// Trigger the 1 capped report: swap to a new fn reference
			currentFn = () => {};
			rerender({ fn: currentFn });
			vi.clearAllMocks();
			// Stable re-renders: same fn reference as prevPropsRef → Path 4 → logNoChange fires
			rerender({ fn: currentFn });
			rerender({ fn: currentFn });
			expect(console.log).toHaveBeenCalledTimes(2);
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});
	});

	// ── ignoreProps ───────────────────────────────────────────────────────────

	describe('ignoreProps', () => {
		it('single ignored key changes → no signal, no log', () => {
			const { rerender } = renderHook(makeHook('Comp', { ignoreProps: ['fn'] }), {
				initialProps: { fn: () => {} } as Record<string, unknown>,
			});
			rerender({ fn: () => {} });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});

		it('ignored reference key + non-ignored primitive key → genuine signal logged', () => {
			const { rerender } = renderHook(makeHook('Comp', { ignoreProps: ['fn'] }), {
				initialProps: { fn: () => {}, count: 1 } as Record<string, unknown>,
			});
			rerender({ fn: () => {}, count: 2 });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
			expect(allLogText()).toContain('EFFECTIVE');
		});

		it('ignored reference key + non-ignored reference key → only non-ignored in unstableProps', () => {
			const { rerender } = renderHook(makeHook('Comp', { ignoreProps: ['onClick'] }), {
				initialProps: { onClick: () => {}, onHover: () => {} } as Record<string, unknown>,
			});
			rerender({ onClick: () => {}, onHover: () => {} });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
			expect(allLogText()).toContain('onHover');
			expect(allLogText()).not.toContain('onClick');
		});
	});

	// ── NOT_APPLICABLE ────────────────────────────────────────────────────────

	describe('NOT_APPLICABLE — only first render observed', () => {
		it('no console output; session never emits', () => {
			renderHook(() => useMemoEffectAnalyzer('Comp', { count: 1 }));
			expect(console.groupCollapsed).not.toHaveBeenCalled();
			expect(console.log).not.toHaveBeenCalled();
		});
	});

	// ── INV9 — logOnEveryRender read-only ─────────────────────────────────────

	describe('INV9 — logOnEveryRender is purely observational', () => {
		it('12 stable re-renders with logOnEveryRender: true → 12 console.log calls, 0 groupCollapsed calls', () => {
			const fn = () => {};
			const { rerender } = renderHook(makeHook('Comp', { logOnEveryRender: true }), {
				initialProps: { fn } as Record<string, unknown>,
			});
			for (let i = 0; i < 12; i++) rerender({ fn });
			expect(console.log).toHaveBeenCalledTimes(12);
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});
	});

	// ── Strict Mode — Group A: stable external props ──────────────────────────

	describe('Strict Mode — Group A: stable external props', () => {
		const stableFn = () => {};
		const stableObj = { x: 1 };

		it('groupCollapsed never called after mount; session remains NOT_APPLICABLE', () => {
			renderHook(() => useMemoEffectAnalyzer('Comp', { fn: stableFn, obj: stableObj }), { wrapper: StrictMode });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});

		it('genuine re-render after StrictMode mount → exactly one groupCollapsed; output contains EFFECTIVE', () => {
			const { rerender } = renderHook((props: Record<string, unknown>) => useMemoEffectAnalyzer('Comp', props), { initialProps: { fn: stableFn, count: 0 } as Record<string, unknown>, wrapper: StrictMode });
			act(() => {
				rerender({ fn: stableFn, count: 1 });
			});
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
			expect(allLogText()).toContain('EFFECTIVE');
		});
	});

	// ── Strict Mode — Group B: inline reference-typed props ──────────────────

	describe('Strict Mode — Group B: inline reference-typed props (signal expected)', () => {
		it('inline function prop → groupCollapsed called once; signal kind reference-only; output contains INEFFECTIVE', () => {
			renderHook(() => useMemoEffectAnalyzer('Comp', { fn: () => {} }), { wrapper: StrictMode });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
			expect(allLogText()).toContain('reference-only');
			expect(allLogText()).toContain('INEFFECTIVE');
		});

		it('inline object prop → groupCollapsed called once; signal kind reference-only', () => {
			renderHook(() => useMemoEffectAnalyzer('Comp', { cfg: {} }), { wrapper: StrictMode });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
			expect(allLogText()).toContain('reference-only');
		});
	});
});
