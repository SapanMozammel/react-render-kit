import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTelemetryBuffer, type RenderEvent } from '@sapanmozammel/render-telemetry-core';
import { createIntelligenceSubsystem, createDisabledIntelligence } from '../src/subsystems/intelligence.js';
import { RenderKitError } from '../src/errors/kit-error.js';
import { resetSeq, nextSeq } from './helpers.js';
import * as intelligenceModule from '@sapanmozammel/render-intelligence';

beforeEach(() => {
	resetSeq();
	vi.restoreAllMocks();
});

import type { AnalysisPlugin } from '@sapanmozammel/render-intelligence';

type IntConfig = {
	enabled: boolean;
	maxBottlenecks: number;
	maxRecommendations: number;
	confidenceThreshold: number;
	correlationWindowMs: number;
	includeWellOptimized: boolean;
	plugins: readonly AnalysisPlugin[];
};

const makeConfig = (overrides?: Partial<IntConfig>): IntConfig => ({
	enabled: true,
	maxBottlenecks: 10,
	maxRecommendations: 20,
	confidenceThreshold: 0.3,
	correlationWindowMs: 16,
	includeWellOptimized: false,
	plugins: [],
	...overrides,
});

const makeRenderEvt = (sessionId = 'session-1', renderNumber = 1): RenderEvent => ({
	id: `evt-${nextSeq()}`,
	type: 'render',
	schemaVersion: '1.0.0',
	sessionId,
	componentName: 'TestComponent',
	sequenceNumber: nextSeq(),
	timestamp: Date.now(),
	wallTimestamp: Date.now(),
	renderNumber,
	triggeredBy: 'props',
});

describe('createIntelligenceSubsystem', () => {
	it('analyze(source) delegates to analyzeRenders (report has applicationHealth)', () => {
		const buffer = createTelemetryBuffer();
		const subsystem = createIntelligenceSubsystem(makeConfig(), buffer);
		const report = subsystem.analyze({ type: 'events', events: [makeRenderEvt()] });
		expect(report.applicationHealth).toBeDefined();
		expect(typeof report.applicationHealth.score).toBe('number');
	});

	it('analyze(source, { maxBottlenecks: 3 }) — caller option overrides kit default', () => {
		const spy = vi.spyOn(intelligenceModule, 'analyzeRenders');
		const buffer = createTelemetryBuffer();
		const subsystem = createIntelligenceSubsystem(makeConfig({ maxBottlenecks: 10 }), buffer);
		subsystem.analyze({ type: 'events', events: [makeRenderEvt()] }, { maxBottlenecks: 3 });
		expect(spy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ maxBottlenecks: 3 }));
	});

	it('analyze(source) uses kit-default maxBottlenecks when caller does not specify', () => {
		const spy = vi.spyOn(intelligenceModule, 'analyzeRenders');
		const buffer = createTelemetryBuffer();
		const subsystem = createIntelligenceSubsystem(makeConfig({ maxBottlenecks: 7 }), buffer);
		subsystem.analyze({ type: 'events', events: [makeRenderEvt()] });
		expect(spy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ maxBottlenecks: 7 }));
	});

	it('kit analysisPlugin is active in analyze() (plugin analyze fn is called)', () => {
		const pluginAnalyze = vi.fn(() => ({
			bottlenecks: [],
			rootCauses: [],
			recommendations: [],
			correlations: [],
		}));
		const analysisPlugin = {
			id: 'test-ap',
			name: 'Test AP',
			version: '1.0.0',
			analyze: pluginAnalyze,
		};
		const buffer = createTelemetryBuffer();
		const subsystem = createIntelligenceSubsystem(makeConfig({ plugins: [analysisPlugin] }), buffer);
		subsystem.analyze({ type: 'events', events: [makeRenderEvt()] });
		expect(pluginAnalyze).toHaveBeenCalled();
	});

	it('analyze() without source uses buffer snapshot', () => {
		const buffer = createTelemetryBuffer();
		buffer.push(makeRenderEvt());
		const subsystem = createIntelligenceSubsystem(makeConfig(), buffer);
		const report = subsystem.analyze();
		expect(report.applicationHealth).toBeDefined();
	});

	it('analyze() without source on empty buffer throws RenderKitError ANALYSIS_FAILED', () => {
		const buffer = createTelemetryBuffer();
		const subsystem = createIntelligenceSubsystem(makeConfig(), buffer);
		expect(() => subsystem.analyze()).toThrow(RenderKitError);
		try {
			subsystem.analyze();
		} catch (e) {
			expect((e as RenderKitError).code).toBe('ANALYSIS_FAILED');
		}
	});

	it('analyze({ type: "events", events: [] }) throws RenderKitError ANALYSIS_FAILED', () => {
		const buffer = createTelemetryBuffer();
		const subsystem = createIntelligenceSubsystem(makeConfig(), buffer);
		expect(() => subsystem.analyze({ type: 'events', events: [] })).toThrow(RenderKitError);
		try {
			subsystem.analyze({ type: 'events', events: [] });
		} catch (e) {
			expect((e as RenderKitError).code).toBe('ANALYSIS_FAILED');
		}
	});

	it('kit plugins run BEFORE caller-provided plugins (ordering verified by call order)', () => {
		const callOrder: string[] = [];
		const kitPlugin = {
			id: 'kit-p',
			name: 'Kit',
			version: '1.0.0',
			analyze: vi.fn(() => {
				callOrder.push('kit');
				return { bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] };
			}),
		};
		const callerPlugin = {
			id: 'caller-p',
			name: 'Caller',
			version: '1.0.0',
			analyze: vi.fn(() => {
				callOrder.push('caller');
				return { bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] };
			}),
		};
		const buffer = createTelemetryBuffer();
		const subsystem = createIntelligenceSubsystem(makeConfig({ plugins: [kitPlugin] }), buffer);
		subsystem.analyze({ type: 'events', events: [makeRenderEvt()] }, { plugins: [callerPlugin] });
		expect(callOrder.indexOf('kit')).toBeLessThan(callOrder.indexOf('caller'));
	});
});

describe('createDisabledIntelligence', () => {
	it('analyze() throws RenderKitError DISABLED', () => {
		const subsystem = createDisabledIntelligence();
		expect(() => subsystem.analyze()).toThrow(RenderKitError);
		try {
			subsystem.analyze();
		} catch (e) {
			expect((e as RenderKitError).code).toBe('DISABLED');
		}
	});

	it('disabled: does NOT call analyzeRenders', () => {
		const spy = vi.spyOn(intelligenceModule, 'analyzeRenders');
		const subsystem = createDisabledIntelligence();
		try {
			subsystem.analyze();
		} catch {
			// expected
		}
		expect(spy).not.toHaveBeenCalled();
	});
});
