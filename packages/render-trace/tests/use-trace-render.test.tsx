import { act, render, renderHook } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEngine } from '../src/engine/engine';
import { useTraceRender } from '../src/hook/use-trace-render';
import type { TraceInstance } from '../src/types';

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve));

describe('useTraceRender', () => {
	let instance: TraceInstance;

	beforeEach(() => {
		instance = createEngine({ logMode: 'silent' });
	});

	afterEach(() => {
		instance.resetTrace();
	});

	describe('single component', () => {
		it('registers one node per render', async () => {
			const { unmount } = renderHook(() => useTraceRender('Counter', { instance }));
			await act(flushMicrotasks);
			const chains = instance.getRenderChains();
			expect(chains).toHaveLength(1);
			expect(chains[0]?.nodes[0]?.componentName).toBe('Counter');
			unmount();
		});

		it('records depth 0 and null parent for a standalone component', async () => {
			const { unmount } = renderHook(() => useTraceRender('Standalone', { instance }));
			await act(flushMicrotasks);
			const node = instance.getRenderChains()[0]?.nodes[0];
			expect(node?.depth).toBe(0);
			expect(node?.parentName).toBeNull();
			unmount();
		});

		it('creates a new cycle on re-render', async () => {
			const { rerender, unmount } = renderHook(() => useTraceRender('Counter', { instance }));
			await act(flushMicrotasks);
			rerender();
			await act(flushMicrotasks);
			expect(instance.getRenderChains()).toHaveLength(2);
			unmount();
		});
	});

	describe('parent-child relationship', () => {
		it('assigns correct depth and parentName to child', async () => {
			const Child = () => {
				useTraceRender('Child', { instance });
				return null;
			};
			const Parent = () => {
				useTraceRender('Parent', { instance });
				return React.createElement(Child);
			};

			await act(async () => {
				render(React.createElement(Parent));
				await flushMicrotasks();
			});

			const chains = instance.getRenderChains();
			expect(chains).toHaveLength(1);
			const child = chains[0]?.nodes.find((n) => n.componentName === 'Child');
			expect(child?.depth).toBe(1);
			expect(child?.parentName).toBe('Parent');
		});

		it('identifies the parent as root trigger', async () => {
			const Child = () => {
				useTraceRender('Child', { instance });
				return null;
			};
			const Parent = () => {
				useTraceRender('Parent', { instance });
				return React.createElement(Child);
			};

			await act(async () => {
				render(React.createElement(Parent));
				await flushMicrotasks();
			});

			expect(instance.getRootCause()).toBe('Parent');
		});
	});

	describe('enabled option', () => {
		it('skips registration when enabled: false', async () => {
			const { unmount } = renderHook(() => useTraceRender('Counter', { instance, enabled: false }));
			await act(flushMicrotasks);
			expect(instance.getRenderChains()).toHaveLength(0);
			unmount();
		});

		it('skips registration when instance.enabled is false', async () => {
			instance.stop();
			const { unmount } = renderHook(() => useTraceRender('Counter', { instance }));
			await act(flushMicrotasks);
			expect(instance.getRenderChains()).toHaveLength(0);
			unmount();
		});
	});

	describe('state-driven re-render', () => {
		it('produces a separate cycle for each render burst', async () => {
			const Counter = () => {
				const [count, setCount] = useState(0);
				useTraceRender('Counter', { instance });
				return React.createElement('button', { onClick: () => setCount((c) => c + 1) }, String(count));
			};

			const { getByRole } = render(React.createElement(Counter));
			await act(flushMicrotasks);
			const beforeCount = instance.getRenderChains().length;

			await act(async () => {
				getByRole('button').click();
				await flushMicrotasks();
			});

			expect(instance.getRenderChains().length).toBeGreaterThan(beforeCount);
		});
	});
});
