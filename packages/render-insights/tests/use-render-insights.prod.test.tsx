import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRenderInsights } from '../src/hook/use-render-insights.js';

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'production');
	vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
	vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('production guard', () => {
	it('reference-type prop change triggers no console output', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p), { initialProps: { p: { fn: () => {} } } });
		rerender({ p: { fn: () => {} } });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});

	it('hook does not throw in production', () => {
		expect(() => {
			renderHook(() => useRenderInsights('C', { a: 1, fn: () => {} }));
		}).not.toThrow();
	});

	it('no output even on primitive change', () => {
		const { rerender } = renderHook(({ p }) => useRenderInsights('C', p), { initialProps: { p: { a: 1 } } });
		rerender({ p: { a: 2 } });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});
});
