/* eslint-disable no-console */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemoEffectAnalyzer } from '../src/hook/use-memo-effect-analyzer';

describe('useMemoEffectAnalyzer — production guard (Path 1)', () => {
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

	it('reference-type prop change triggers no console output', () => {
		const { rerender } = renderHook((props: Record<string, unknown>) => useMemoEffectAnalyzer('Comp', props), { initialProps: { fn: () => {} } as Record<string, unknown> });
		rerender({ fn: () => {} });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});

	it('hook invocation does not throw in production', () => {
		expect(() => {
			renderHook(() => useMemoEffectAnalyzer('Comp', { fn: () => {} }));
		}).not.toThrow();
	});
});
