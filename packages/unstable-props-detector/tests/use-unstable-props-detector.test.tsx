/* eslint-disable no-console */
import { StrictMode } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnstablePropsDetector } from '../src/hook/use-unstable-props-detector';

const makeHook = (componentName: string, options?: Parameters<typeof useUnstablePropsDetector>[2]) => (props: Record<string, unknown>) => useUnstablePropsDetector(componentName, props, options);

describe('useUnstablePropsDetector', () => {
	beforeEach(() => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('first render', () => {
		it('does not log on the first render', () => {
			renderHook(() => useUnstablePropsDetector('Comp', { fn: () => {} }));
			expect(console.groupCollapsed).not.toHaveBeenCalled();
			expect(console.log).not.toHaveBeenCalled();
		});
	});

	describe('instability detection', () => {
		it('logs when a function prop changes reference on re-render', () => {
			const { rerender } = renderHook(makeHook('Comp'), {
				initialProps: { fn: () => {} } as Record<string, unknown>,
			});
			rerender({ fn: () => {} });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
		});

		it('does not log when props are stable on re-render', () => {
			const fn = () => {};
			const { rerender } = renderHook(makeHook('Comp'), {
				initialProps: { fn } as Record<string, unknown>,
			});
			rerender({ fn });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});

		it('does not log when a primitive prop changes', () => {
			const { rerender } = renderHook(makeHook('Comp'), {
				initialProps: { count: 1 } as Record<string, unknown>,
			});
			rerender({ count: 2 });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});
	});

	describe('ignoreProps', () => {
		it('does not log when the changed prop is in ignoreProps', () => {
			const { rerender } = renderHook(makeHook('Comp', { ignoreProps: ['onClick'] }), { initialProps: { onClick: () => {} } as Record<string, unknown> });
			rerender({ onClick: () => {} });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});

		it('logs for props not in ignoreProps even when some are ignored', () => {
			const { rerender } = renderHook(makeHook('Comp', { ignoreProps: ['onClick'] }), { initialProps: { onClick: () => {}, onHover: () => {} } as Record<string, unknown> });
			rerender({ onClick: () => {}, onHover: () => {} });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
		});
	});

	describe('enabled option', () => {
		it('is completely silent when enabled: false', () => {
			const { rerender } = renderHook(makeHook('Comp', { enabled: false }), { initialProps: { fn: () => {} } as Record<string, unknown> });
			rerender({ fn: () => {} });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
			expect(console.log).not.toHaveBeenCalled();
		});
	});

	describe('maxReports cap', () => {
		it('stops logging instability after maxReports is reached', () => {
			const { rerender } = renderHook(makeHook('Comp', { maxReports: 3 }), { initialProps: { fn: () => {} } as Record<string, unknown> });
			for (let i = 0; i < 5; i++) {
				rerender({ fn: () => {} });
			}
			expect(console.groupCollapsed).toHaveBeenCalledTimes(3);
		});

		it('appends suppression notice on the final report', () => {
			const { rerender } = renderHook(makeHook('Comp', { maxReports: 2 }), { initialProps: { fn: () => {} } as Record<string, unknown> });
			rerender({ fn: () => {} }); // report 1
			rerender({ fn: () => {} }); // report 2 — last
			rerender({ fn: () => {} }); // suppressed

			const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
			expect(logCalls).toContain('further reports suppressed');
		});
	});

	describe('logOnEveryRender', () => {
		it('calls console.log (not groupCollapsed) on a stable re-render', () => {
			const fn = () => {};
			const { rerender } = renderHook(makeHook('Comp', { logOnEveryRender: true }), { initialProps: { fn } as Record<string, unknown> });
			rerender({ fn });
			expect(console.groupCollapsed).not.toHaveBeenCalled();
			expect(console.log).toHaveBeenCalledOnce();
		});

		it('uses groupCollapsed (not just log) when instability is detected with logOnEveryRender: true', () => {
			const { rerender } = renderHook(makeHook('Comp', { logOnEveryRender: true }), { initialProps: { fn: () => {} } as Record<string, unknown> });
			rerender({ fn: () => {} });
			expect(console.groupCollapsed).toHaveBeenCalledOnce();
		});

		it('does not cap stable logs against maxReports', () => {
			const fn = () => {};
			const { rerender } = renderHook(makeHook('Comp', { logOnEveryRender: true, maxReports: 3 }), { initialProps: { fn } as Record<string, unknown> });
			for (let i = 0; i < 12; i++) {
				rerender({ fn });
			}
			// 12 stable re-renders → 12 console.log calls, none capped
			expect(console.log).toHaveBeenCalledTimes(12);
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});
	});

	describe('Strict Mode', () => {
		it('does not log on first mount inside StrictMode when props are stable', () => {
			// The stable function is defined outside — both Strict Mode invocations
			// receive the same reference, so Object.is comparison returns true.
			const stableFn = () => {};
			const TestComp = ({ fn }: { fn: () => void }) => {
				useUnstablePropsDetector('Comp', { fn } as Record<string, unknown>);
				return null;
			};
			render(
				<StrictMode>
					<TestComp fn={stableFn} />
				</StrictMode>
			);
			expect(console.groupCollapsed).not.toHaveBeenCalled();
		});

		it('logs exactly once per actual prop change inside StrictMode', () => {
			let renderFn = () => {};

			const TestComp = ({ fn }: { fn: () => void }) => {
				useUnstablePropsDetector('Comp', { fn } as Record<string, unknown>);
				return null;
			};

			const { rerender } = render(
				<StrictMode>
					<TestComp fn={renderFn} />
				</StrictMode>
			);

			act(() => {
				renderFn = () => {};
				rerender(
					<StrictMode>
						<TestComp fn={renderFn} />
					</StrictMode>
				);
			});

			expect(console.groupCollapsed).toHaveBeenCalledOnce();
		});
	});
});
