import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveConfig } from '../src/config/kit-config.js';
import { resetSeq } from './helpers.js';

beforeEach(() => {
	resetSeq();
	vi.restoreAllMocks();
});

describe('resolveConfig', () => {
	it('no-arg call returns all defaults', () => {
		const resolved = resolveConfig({});
		expect(resolved.enabled).toBe(true); // NODE_ENV=development in vitest config
		expect(resolved.telemetry.maxEvents).toBe(1000);
		expect(resolved.telemetry.transports).toEqual([]);
		expect(resolved.replay.maxFrames).toBe(100);
		expect(resolved.replay.pruningStrategy).toBe('fifo');
		expect(resolved.intelligence.maxBottlenecks).toBe(10);
		expect(resolved.intelligence.maxRecommendations).toBe(20);
		expect(resolved.intelligence.confidenceThreshold).toBe(0.3);
		expect(resolved.intelligence.correlationWindowMs).toBe(16);
		expect(resolved.intelligence.includeWellOptimized).toBe(false);
		expect(resolved.plugins).toEqual([]);
	});

	it('enabled: true explicit — all subsystems resolve to true', () => {
		const resolved = resolveConfig({ enabled: true });
		expect(resolved.enabled).toBe(true);
		expect(resolved.telemetry.enabled).toBe(true);
		expect(resolved.replay.enabled).toBe(true);
		expect(resolved.intelligence.enabled).toBe(true);
	});

	it('enabled: false explicit — all subsystems resolve to false', () => {
		const resolved = resolveConfig({ enabled: false });
		expect(resolved.enabled).toBe(false);
		expect(resolved.telemetry.enabled).toBe(false);
		expect(resolved.replay.enabled).toBe(false);
		expect(resolved.intelligence.enabled).toBe(false);
	});

	it('NODE_ENV production → enabled defaults to false', () => {
		const originalEnv = process.env['NODE_ENV'];
		process.env['NODE_ENV'] = 'production';
		try {
			const resolved = resolveConfig({});
			expect(resolved.enabled).toBe(false);
		} finally {
			process.env['NODE_ENV'] = originalEnv;
		}
	});

	it('NODE_ENV development → enabled defaults to true', () => {
		const originalEnv = process.env['NODE_ENV'];
		process.env['NODE_ENV'] = 'development';
		try {
			const resolved = resolveConfig({});
			expect(resolved.enabled).toBe(true);
		} finally {
			process.env['NODE_ENV'] = originalEnv;
		}
	});

	it('subsystem enabled: false with parent enabled: true — subsystem respects own flag', () => {
		const resolved = resolveConfig({
			enabled: true,
			telemetry: { enabled: false },
			replay: { enabled: false },
		});
		expect(resolved.enabled).toBe(true);
		expect(resolved.telemetry.enabled).toBe(false);
		expect(resolved.replay.enabled).toBe(false);
		expect(resolved.intelligence.enabled).toBe(true);
	});

	it('maxEvents: 0 → clamped to 1; warn logged', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const resolved = resolveConfig({ telemetry: { maxEvents: 0 } });
		expect(resolved.telemetry.maxEvents).toBe(1);
		expect(warnSpy).toHaveBeenCalledWith('[render-kit] telemetry.maxEvents clamped to 1');
	});

	it('maxEvents: -5 → clamped to 1; warn logged', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const resolved = resolveConfig({ telemetry: { maxEvents: -5 } });
		expect(resolved.telemetry.maxEvents).toBe(1);
		expect(warnSpy).toHaveBeenCalledWith('[render-kit] telemetry.maxEvents clamped to 1');
	});

	it('confidenceThreshold: -0.1 → clamped to 0; warn logged', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const resolved = resolveConfig({ intelligence: { confidenceThreshold: -0.1 } });
		expect(resolved.intelligence.confidenceThreshold).toBe(0);
		expect(warnSpy).toHaveBeenCalledWith('[render-kit] intelligence.confidenceThreshold clamped to 0');
	});

	it('confidenceThreshold: 1.5 → clamped to 1; warn logged', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const resolved = resolveConfig({ intelligence: { confidenceThreshold: 1.5 } });
		expect(resolved.intelligence.confidenceThreshold).toBe(1);
		expect(warnSpy).toHaveBeenCalledWith('[render-kit] intelligence.confidenceThreshold clamped to 1');
	});

	it('maxBottlenecks: 0 → clamped to 1; warn logged', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const resolved = resolveConfig({ intelligence: { maxBottlenecks: 0 } });
		expect(resolved.intelligence.maxBottlenecks).toBe(1);
		expect(warnSpy).toHaveBeenCalledWith('[render-kit] intelligence.maxBottlenecks clamped to 1');
	});

	it('maxFrames: 0 → clamped to 1; warn logged', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const resolved = resolveConfig({ replay: { maxFrames: 0 } });
		expect(resolved.replay.maxFrames).toBe(1);
		expect(warnSpy).toHaveBeenCalledWith('[render-kit] replay.maxFrames clamped to 1');
	});

	it('plugin with empty id → skipped (not in resolved.plugins); warn logged', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const resolved = resolveConfig({
			plugins: [{ id: '', name: 'P', version: '1.0.0' }],
		});
		expect(resolved.plugins).toHaveLength(0);
		expect(warnSpy).toHaveBeenCalledWith('[render-kit] plugin at index 0 has empty id — skipped');
	});

	it('plugin with whitespace-only id → skipped; warn logged', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const resolved = resolveConfig({
			plugins: [{ id: '   ', name: 'P', version: '1.0.0' }],
		});
		expect(resolved.plugins).toHaveLength(0);
		expect(warnSpy).toHaveBeenCalled();
	});

	it('analysisPlugin on RenderKitPlugin → appears in resolved intelligence.plugins BEFORE caller plugins', () => {
		const kitAnalysisPlugin = {
			id: 'kit-ap',
			name: 'Kit AP',
			version: '1.0.0',
			analyze: vi.fn(() => ({ bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] })),
		};
		const callerPlugin = {
			id: 'caller-ap',
			name: 'Caller AP',
			version: '1.0.0',
			analyze: vi.fn(() => ({ bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] })),
		};
		const resolved = resolveConfig({
			plugins: [{ id: 'kit-plugin', name: 'Kit Plugin', version: '1.0.0', analysisPlugin: kitAnalysisPlugin }],
			intelligence: { plugins: [callerPlugin] },
		});
		expect(resolved.intelligence.plugins).toHaveLength(2);
		expect(resolved.intelligence.plugins[0]).toBe(kitAnalysisPlugin);
		expect(resolved.intelligence.plugins[1]).toBe(callerPlugin);
	});
});
