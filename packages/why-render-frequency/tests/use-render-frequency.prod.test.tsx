import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRenderFrequency } from '../src/hook/use-render-frequency';

describe('useRenderFrequency (production)', () => {
	beforeEach(() => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it('does not log on first render when NODE_ENV is production', () => {
		renderHook(() => useRenderFrequency('Comp', { sampleEvery: 1 }));
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});

	it('does not log on re-renders when NODE_ENV is production', () => {
		const { rerender } = renderHook(() => useRenderFrequency('Comp', { sampleEvery: 1 }));
		rerender();
		rerender();
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});

	it('does not throw when NODE_ENV is production', () => {
		expect(() => {
			const { rerender } = renderHook(() => useRenderFrequency('Comp'));
			rerender();
		}).not.toThrow();
	});
});
