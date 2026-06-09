/**
 * Production guard: NODE_ENV=production is set for this file via vitest config override.
 * All useTraceRender calls must be no-ops — no registration, no console output.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEngine } from '../src/engine/engine';
import { useTraceRender } from '../src/hook/use-trace-render';
import type { TraceInstance } from '../src/types';

describe('useTraceRender — production guard', () => {
	let instance: TraceInstance;

	beforeEach(() => {
		instance = createEngine({ logMode: 'silent' });
		vi.stubEnv('NODE_ENV', 'production');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		instance.resetTrace();
	});

	it('does not register any node in production', async () => {
		const { unmount } = renderHook(() => useTraceRender('Widget', { instance }));
		await new Promise<void>((resolve) => queueMicrotask(resolve));
		expect(instance.getRenderChains()).toHaveLength(0);
		unmount();
	});

	it('produces no console output in production', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

		const { unmount } = renderHook(() => useTraceRender('Widget', { instance }));
		await new Promise<void>((resolve) => queueMicrotask(resolve));

		expect(warnSpy).not.toHaveBeenCalled();
		expect(logSpy).not.toHaveBeenCalled();

		warnSpy.mockRestore();
		logSpy.mockRestore();
		unmount();
	});
});
