import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlaygroundProvider } from '../../src/context/playground-context.js';
import { useRenderPlayground } from '../../src/hooks/use-render-playground.js';

const wrapper = ({ children }: { children: React.ReactNode }) => <PlaygroundProvider>{children}</PlaygroundProvider>;

const makeProps = () => ({ title: 'Hello', count: 1 });

describe('useRenderPlayground', () => {
	it('does not throw when called inside a provider', () => {
		expect(() => {
			renderHook(() => useRenderPlayground('TestComp', makeProps()), { wrapper });
		}).not.toThrow();
	});

	it('does not throw after microtask flush', async () => {
		const CapturingWrapper = ({ children }: { children: React.ReactNode }) => {
			return <PlaygroundProvider>{children}</PlaygroundProvider>;
		};

		const Inner = () => {
			useRenderPlayground('TestComp', makeProps());
			return null;
		};

		const { unmount } = renderHook(() => <Inner />, { wrapper: CapturingWrapper });

		// The push is deferred via queueMicrotask — flush it
		await Promise.resolve();
		unmount();
	});

	it('throws in development when called without a provider', () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';
		expect(() => {
			renderHook(() => useRenderPlayground('TestComp', makeProps()));
		}).toThrow('[render-playground]');
		process.env.NODE_ENV = original;
	});

	it('does not throw in production without a provider', () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		expect(() => {
			renderHook(() => useRenderPlayground('TestComp', makeProps()));
		}).not.toThrow();
		process.env.NODE_ENV = original;
	});

	it('returns undefined (void) on every render', () => {
		const { result } = renderHook(() => useRenderPlayground('TestComp', makeProps()), { wrapper });
		expect(result.current).toBeUndefined();
	});
});
