import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaygroundContext, PlaygroundProvider, usePlaygroundStore } from '../../src/context/playground-context.js';
import { createPlaygroundStore } from '../../src/store/playground-store.js';

describe('PlaygroundProvider', () => {
	it('renders children', () => {
		const { getByText } = render(
			<PlaygroundProvider>
				<span>hello</span>
			</PlaygroundProvider>,
		);
		expect(getByText('hello')).toBeDefined();
	});

	it('provides a store through context in development', () => {
		let captured: ReturnType<typeof createPlaygroundStore> | null = null;
		const Consumer = () => {
			captured = React.useContext(PlaygroundContext) as ReturnType<typeof createPlaygroundStore>;
			return null;
		};
		render(
			<PlaygroundProvider>
				<Consumer />
			</PlaygroundProvider>,
		);
		expect(captured).not.toBeNull();
		expect(typeof (captured as unknown as ReturnType<typeof createPlaygroundStore>).subscribe).toBe('function');
	});

	it('uses a supplied store instead of creating one', () => {
		const customStore = createPlaygroundStore(10);
		let captured = null;
		const Consumer = () => {
			captured = React.useContext(PlaygroundContext);
			return null;
		};
		render(
			<PlaygroundProvider store={customStore}>
				<Consumer />
			</PlaygroundProvider>,
		);
		expect(captured).toBe(customStore);
	});

	it('renders a Fragment (no Provider) in production', () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		let captured: unknown = 'not-called';
		const Consumer = () => {
			captured = React.useContext(PlaygroundContext);
			return null;
		};
		render(
			<PlaygroundProvider>
				<Consumer />
			</PlaygroundProvider>,
		);
		// In production the Provider wrapper is skipped, so context is null
		expect(captured).toBeNull();
		process.env.NODE_ENV = original;
	});
});

describe('usePlaygroundStore', () => {
	it('throws in development when called outside a provider', () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';
		expect(() => {
			renderHook(() => usePlaygroundStore());
		}).toThrow('[render-playground]');
		process.env.NODE_ENV = original;
	});

	it('returns the store when used inside a provider', () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <PlaygroundProvider>{children}</PlaygroundProvider>;
		const { result } = renderHook(() => usePlaygroundStore(), { wrapper });
		expect(typeof result.current.subscribe).toBe('function');
		expect(typeof result.current.push).toBe('function');
	});

	it('does not throw in production when context is null', () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		expect(() => {
			renderHook(() => usePlaygroundStore());
		}).not.toThrow();
		process.env.NODE_ENV = original;
	});
});
