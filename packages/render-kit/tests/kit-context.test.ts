import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { RenderKitProvider, useRenderKit } from '../src/context/kit-context.js';
import { RenderKitError } from '../src/errors/kit-error.js';
import { makeKit, makeDisabledKit, resetSeq } from './helpers.js';
import type { RenderKit } from '../src/types/index.js';

beforeEach(() => resetSeq());

const makeWrapper = (kit: RenderKit) => {
	const Wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(RenderKitProvider, { kit, children });
	return Wrapper;
};

describe('useRenderKit + RenderKitProvider', () => {
	it('useRenderKit() outside provider throws RenderKitError CONTEXT_MISSING', () => {
		const { result } = renderHook(() => {
			try {
				return useRenderKit();
			} catch (e) {
				return e;
			}
		});
		expect(result.current).toBeInstanceOf(RenderKitError);
		expect((result.current as RenderKitError).code).toBe('CONTEXT_MISSING');
	});

	it('useRenderKit() inside provider returns the kit passed to RenderKitProvider', () => {
		const kit = makeKit();
		const { result } = renderHook(() => useRenderKit(), { wrapper: makeWrapper(kit) });
		expect(result.current).toBe(kit);
		kit.destroy();
	});

	it('kit reference is stable across re-renders', () => {
		const kit = makeKit();
		const { result, rerender } = renderHook(() => useRenderKit(), { wrapper: makeWrapper(kit) });
		const first = result.current;
		rerender();
		expect(result.current).toBe(first);
		kit.destroy();
	});

	it('nested providers: useRenderKit() returns the inner kit', () => {
		const outer = makeKit();
		const inner = makeKit();
		const NestedWrapper = ({ children }: { children: React.ReactNode }) =>
			React.createElement(RenderKitProvider, {
				kit: outer,
				children: React.createElement(RenderKitProvider, { kit: inner, children }),
			});
		const { result } = renderHook(() => useRenderKit(), { wrapper: NestedWrapper });
		expect(result.current).toBe(inner);
		outer.destroy();
		inner.destroy();
	});

	it('RenderKitProvider renders children', () => {
		const kit = makeKit();
		const { result } = renderHook(
			() => {
				const k = useRenderKit();
				return k.enabled;
			},
			{ wrapper: makeWrapper(kit) }
		);
		expect(result.current).toBe(true);
		kit.destroy();
	});

	it('RenderKitProvider with disabled kit — useRenderKit() returns disabled kit; kit.enabled === false', () => {
		const kit = makeDisabledKit();
		const { result } = renderHook(() => useRenderKit(), { wrapper: makeWrapper(kit) });
		expect(result.current).toBe(kit);
		expect(result.current.enabled).toBe(false);
	});
});
