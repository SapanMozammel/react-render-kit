import { describe, it, expect } from 'vitest';
import {
	useWhyRender,
	useRenderFrequency,
	useTraceRender,
	useUnstablePropsDetector,
	useMemoEffectAnalyzer,
	useRenderInsights,
	useRenderPlayground,
	RenderPlaygroundPanel,
	createTelemetryBuffer,
	createReplayEngine,
	analyzeRenders,
} from '../src/index.js';

describe('Locked re-export manifest', () => {
	it('useWhyRender is a function', () => {
		expect(typeof useWhyRender).toBe('function');
	});

	it('useRenderFrequency is a function', () => {
		expect(typeof useRenderFrequency).toBe('function');
	});

	it('useTraceRender is a function', () => {
		expect(typeof useTraceRender).toBe('function');
	});

	it('useUnstablePropsDetector is a function', () => {
		expect(typeof useUnstablePropsDetector).toBe('function');
	});

	it('useMemoEffectAnalyzer is a function', () => {
		expect(typeof useMemoEffectAnalyzer).toBe('function');
	});

	it('useRenderInsights is a function', () => {
		expect(typeof useRenderInsights).toBe('function');
	});

	it('useRenderPlayground is a function', () => {
		expect(typeof useRenderPlayground).toBe('function');
	});

	it('RenderPlaygroundPanel is truthy', () => {
		expect(RenderPlaygroundPanel).toBeTruthy();
	});

	it('createTelemetryBuffer is a function', () => {
		expect(typeof createTelemetryBuffer).toBe('function');
	});

	it('createReplayEngine is a function', () => {
		expect(typeof createReplayEngine).toBe('function');
	});

	it('analyzeRenders is a function', () => {
		expect(typeof analyzeRenders).toBe('function');
	});
});
