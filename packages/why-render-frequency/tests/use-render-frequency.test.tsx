import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRenderFrequency } from '../src/hook/use-render-frequency';

describe('useRenderFrequency', () => {
	beforeEach(() => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('sampleEvery — log emission gating', () => {
		it('logs on render 1 when sampleEvery is 1', () => {
			renderHook(() => useRenderFrequency('Comp', { sampleEvery: 1 }));
			expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
			expect(console.groupCollapsed).toHaveBeenCalledWith('[why-render-frequency] <Comp>');
		});

		it('logs on every render when sampleEvery is 1', () => {
			const { rerender } = renderHook(() => useRenderFrequency('Comp', { sampleEvery: 1 }));
			rerender();
			rerender();
			expect(console.groupCollapsed).toHaveBeenCalledTimes(3);
		});

		it('does not log on renders 1-9 with default sampleEvery (10)', () => {
			const { rerender } = renderHook(() => useRenderFrequency('Comp'));
			for (let i = 0; i < 8; i++) rerender();
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});

		it('logs at render 10 with default sampleEvery (10)', () => {
			const { rerender } = renderHook(() => useRenderFrequency('Comp'));
			for (let i = 0; i < 9; i++) rerender();
			expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
		});

		it('logs at renders 10 and 20 with default sampleEvery (10)', () => {
			const { rerender } = renderHook(() => useRenderFrequency('Comp'));
			for (let i = 0; i < 19; i++) rerender();
			expect(console.groupCollapsed).toHaveBeenCalledTimes(2);
		});

		it('sampleEvery: 0 is treated as 1 (logs every render)', () => {
			const { rerender } = renderHook(() => useRenderFrequency('Comp', { sampleEvery: 0 }));
			rerender();
			expect(console.groupCollapsed).toHaveBeenCalledTimes(2);
		});
	});

	describe('render counting', () => {
		it('counter increments on every render regardless of sampleEvery', () => {
			// sampleEvery=5: logs at render 5. If counting is correct, log shows count=5.
			const { rerender } = renderHook(() => useRenderFrequency('Comp', { sampleEvery: 5 }));
			for (let i = 0; i < 4; i++) rerender();
			expect(console.log).toHaveBeenCalledWith('  5');
		});

		it('total count is included in every log', () => {
			const { rerender } = renderHook(() => useRenderFrequency('Comp', { sampleEvery: 1 }));
			expect(console.log).toHaveBeenCalledWith('  1');
			rerender();
			expect(console.log).toHaveBeenCalledWith('  2');
		});
	});

	describe('time window', () => {
		it('window count includes all renders within windowMs', () => {
			// sampleEvery=5: logs at render 5. All 5 renders happen instantly, all in window.
			const { rerender } = renderHook(() => useRenderFrequency('Comp', { sampleEvery: 5, windowMs: 10000 }));
			for (let i = 0; i < 4; i++) rerender();
			expect(console.log).toHaveBeenCalledWith('  5 renders');
		});

		it('window count excludes renders older than windowMs', () => {
			vi.useFakeTimers();
			const { rerender } = renderHook(() => useRenderFrequency('Comp', { sampleEvery: 1, windowMs: 1000 }));
			// Render 1 at t=0 — windowCount should be 1
			expect(console.log).toHaveBeenCalledWith('  1 renders');
			vi.clearAllMocks();

			vi.advanceTimersByTime(1500);
			rerender(); // Render 2 at t=1500ms, cutoff=500ms, old timestamp 0 is pruned
			expect(console.log).toHaveBeenCalledWith('  1 renders');
		});

		it('windowMs: 0 is clamped to 1 (no throw, no NaN/Infinity in output)', () => {
			expect(() => {
				renderHook(() => useRenderFrequency('Comp', { windowMs: 0, sampleEvery: 1 }));
			}).not.toThrow();
			expect(console.groupCollapsed).toHaveBeenCalled();
			const allLogCalls = vi.mocked(console.log).mock.calls.flat().join(' ');
			expect(allLogCalls).not.toContain('NaN');
			expect(allLogCalls).not.toContain('Infinity');
		});

		it('windowMs: -5 is clamped to 1', () => {
			expect(() => {
				renderHook(() => useRenderFrequency('Comp', { windowMs: -5, sampleEvery: 1 }));
			}).not.toThrow();
			expect(console.groupCollapsed).toHaveBeenCalled();
		});
	});

	describe('rate and observation', () => {
		it('rate is included in every log output', () => {
			renderHook(() => useRenderFrequency('Comp', { sampleEvery: 1, windowMs: 10000 }));
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('renders/sec'));
		});

		it('observation: low when rate <= 2 (1 render in 10s)', () => {
			renderHook(() => useRenderFrequency('Comp', { sampleEvery: 1, windowMs: 10000 }));
			// rate = 1/10 = 0.1 <= 2
			expect(console.log).toHaveBeenCalledWith('  Low render activity');
		});

		it('observation: high when rate > 10 (11 renders in 1s window)', () => {
			const { rerender } = renderHook(() => useRenderFrequency('Comp', { sampleEvery: 11, windowMs: 1000 }));
			for (let i = 0; i < 10; i++) rerender(); // 11 total, all in 1s window → rate=11
			expect(console.log).toHaveBeenCalledWith('  High render frequency detected');
		});

		it('observation: moderate when rate > 2 (3 renders in 1s window)', () => {
			const { rerender } = renderHook(() => useRenderFrequency('Comp', { sampleEvery: 3, windowMs: 1000 }));
			rerender();
			rerender(); // 3 total, all in 1s window → rate=3
			expect(console.log).toHaveBeenCalledWith('  Moderate render activity');
		});
	});

	describe('enabled option', () => {
		it('enabled: false suppresses logging', () => {
			const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useRenderFrequency('Comp', { enabled, sampleEvery: 1 }), {
				initialProps: { enabled: false },
			});
			rerender({ enabled: false });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});

		it('enabled: false does not increment count', () => {
			const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useRenderFrequency('Comp', { enabled, sampleEvery: 1 }), {
				initialProps: { enabled: false },
			});
			for (let i = 0; i < 4; i++) rerender({ enabled: false });
			// Re-enable: first counted render should show count=1
			rerender({ enabled: true });
			expect(console.log).toHaveBeenCalledWith('  1');
		});

		it('re-enabling resumes counting from where it left off', () => {
			// 10 enabled renders → log fires once (count=10)
			// 5 disabled renders → count stays at 10
			// 10 more enabled renders → log fires again at count=20
			const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useRenderFrequency('Comp', { enabled, sampleEvery: 10 }), {
				initialProps: { enabled: true },
			});
			for (let i = 0; i < 9; i++) rerender({ enabled: true }); // total: 10 enabled
			expect(console.groupCollapsed).toHaveBeenCalledTimes(1);

			for (let i = 0; i < 5; i++) rerender({ enabled: false }); // 5 disabled
			expect(console.groupCollapsed).toHaveBeenCalledTimes(1);

			for (let i = 0; i < 10; i++) rerender({ enabled: true }); // 10 more enabled → count=20
			expect(console.groupCollapsed).toHaveBeenCalledTimes(2);
		});
	});

	describe('component name', () => {
		it('includes the component name in the log header', () => {
			renderHook(() => useRenderFrequency('SearchResults', { sampleEvery: 1 }));
			expect(console.groupCollapsed).toHaveBeenCalledWith('[why-render-frequency] <SearchResults>');
		});
	});
});
