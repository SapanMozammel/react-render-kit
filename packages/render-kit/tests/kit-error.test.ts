import { describe, it, expect } from 'vitest';
import { RenderKitError, createRenderKitError } from '../src/errors/kit-error.js';
import type { RenderKitErrorCode } from '../src/types/index.js';

describe('RenderKitError', () => {
	it('instanceof Error is true', () => {
		const err = new RenderKitError('INIT_FAILED', 'test');
		expect(err).toBeInstanceOf(Error);
	});

	it('instanceof RenderKitError is true', () => {
		const err = new RenderKitError('INIT_FAILED', 'test');
		expect(err).toBeInstanceOf(RenderKitError);
	});

	it('.code matches constructor argument', () => {
		const err = new RenderKitError('REPLAY_FAILED', 'replay error');
		expect(err.code).toBe('REPLAY_FAILED');
	});

	it('.message matches constructor argument', () => {
		const err = new RenderKitError('CONTEXT_MISSING', 'no context');
		expect(err.message).toBe('no context');
	});

	it('all 8 error codes construct without throw', () => {
		const codes: RenderKitErrorCode[] = ['INIT_FAILED', 'TELEMETRY_FAILED', 'REPLAY_FAILED', 'ANALYSIS_FAILED', 'PLUGIN_FAILED', 'CONTEXT_MISSING', 'DISABLED', 'INVALID_CONFIG'];
		codes.forEach((code) => {
			expect(() => new RenderKitError(code, 'msg')).not.toThrow();
		});
	});

	it('createRenderKitError produces result identical to new RenderKitError', () => {
		const factory = createRenderKitError('ANALYSIS_FAILED', 'failed');
		const direct = new RenderKitError('ANALYSIS_FAILED', 'failed');
		expect(factory).toBeInstanceOf(RenderKitError);
		expect(factory.code).toBe(direct.code);
		expect(factory.message).toBe(direct.message);
	});
});
