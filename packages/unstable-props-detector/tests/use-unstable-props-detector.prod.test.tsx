/* eslint-disable no-console */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnstablePropsDetector } from '../src/hook/use-unstable-props-detector';

describe('useUnstablePropsDetector — production', () => {
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

	it('does not log anything in production', () => {
		const { rerender } = renderHook((props: Record<string, unknown>) => useUnstablePropsDetector('Comp', props), { initialProps: { fn: () => {} } });
		rerender({ fn: () => {} });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});

	it('does not throw in production', () => {
		expect(() => {
			renderHook((props: Record<string, unknown>) => useUnstablePropsDetector('Comp', props), { initialProps: { fn: () => {} } });
		}).not.toThrow();
	});
});
