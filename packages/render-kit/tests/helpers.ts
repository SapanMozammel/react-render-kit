import { vi } from 'vitest';
import { createRenderKit } from '../src/factory/kit-factory.js';
import type { RenderKit, RenderKitConfig, RenderKitPlugin } from '../src/types/index.js';
import type { RenderEvent, ScoreEvent } from '@sapanmozammel/render-telemetry-core';

let seq = 0;

export const resetSeq = (): void => {
	seq = 0;
};

export const nextSeq = (): number => ++seq;

export const makeKit = (config?: RenderKitConfig): RenderKit => createRenderKit(config);

export const makeDisabledKit = (): RenderKit => createRenderKit({ enabled: false });

export const makePlugin = (overrides?: Partial<RenderKitPlugin>): RenderKitPlugin => ({
	id: `plugin-${nextSeq()}`,
	name: 'Test Plugin',
	version: '1.0.0',
	onInit: vi.fn(),
	onDestroy: vi.fn(),
	...overrides,
});

export const makeRenderEvent = (overrides?: Partial<RenderEvent>): RenderEvent => ({
	id: `evt-${nextSeq()}`,
	type: 'render',
	schemaVersion: '1.0.0',
	sessionId: 'session-1',
	componentName: 'TestComponent',
	sequenceNumber: nextSeq(),
	timestamp: Date.now(),
	wallTimestamp: Date.now(),
	renderNumber: 1,
	triggeredBy: 'props',
	...overrides,
});

export const makeScoreEvent = (overrides?: Partial<ScoreEvent>): ScoreEvent => ({
	id: `evt-${nextSeq()}`,
	type: 'score',
	schemaVersion: '1.0.0',
	sessionId: 'session-1',
	componentName: 'TestComponent',
	sequenceNumber: nextSeq(),
	timestamp: Date.now(),
	wallTimestamp: Date.now(),
	renderNumber: 1,
	score: 80,
	grade: 'GOOD',
	memoClassification: 'EFFECTIVE',
	signalKind: null,
	frequencyPenalty: 0,
	instabilityPenalty: 0,
	memoPenalty: 0,
	mixedSignalPenalty: 0,
	...overrides,
});
