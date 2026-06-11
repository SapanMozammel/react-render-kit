import { describe, it, expect, beforeEach } from 'vitest';
import { createTelemetryBuffer, serializeBuffer } from '@sapanmozammel/render-telemetry-core';
import type { RenderEvent } from '@sapanmozammel/render-telemetry-core';
import { createReplaySubsystem, createDisabledReplay } from '../src/subsystems/replay.js';
import { RenderKitError } from '../src/errors/kit-error.js';
import { resetSeq, nextSeq } from './helpers.js';

beforeEach(() => resetSeq());

const makeConfig = () => ({
	enabled: true,
	maxFrames: 100,
	pruningStrategy: 'fifo' as const,
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

describe('createReplaySubsystem', () => {
	it('fromBuffer() on empty buffer returns []', () => {
		const buffer = createTelemetryBuffer();
		const replay = createReplaySubsystem(makeConfig(), buffer);
		expect(replay.fromBuffer()).toEqual([]);
	});

	it('fromBuffer() with events in buffer returns ReplaySession[]', () => {
		const buffer = createTelemetryBuffer();
		const replay = createReplaySubsystem(makeConfig(), buffer);
		buffer.push(makeRenderEvt());
		const sessions = replay.fromBuffer();
		expect(sessions.length).toBeGreaterThan(0);
	});

	it('fromEvents([]) returns []', () => {
		const buffer = createTelemetryBuffer();
		const replay = createReplaySubsystem(makeConfig(), buffer);
		expect(replay.fromEvents([])).toEqual([]);
	});

	it('fromEvents(events) returns ReplaySession[]', () => {
		const buffer = createTelemetryBuffer();
		const replay = createReplaySubsystem(makeConfig(), buffer);
		const sessions = replay.fromEvents([makeRenderEvt()]);
		expect(sessions.length).toBeGreaterThan(0);
	});

	it('fromSerialized("") throws RenderKitError REPLAY_FAILED', () => {
		const buffer = createTelemetryBuffer();
		const replay = createReplaySubsystem(makeConfig(), buffer);
		expect(() => replay.fromSerialized('')).toThrow(RenderKitError);
		try {
			replay.fromSerialized('');
		} catch (e) {
			expect((e as RenderKitError).code).toBe('REPLAY_FAILED');
		}
	});

	it('fromSerialized(validJson) returns ReplaySession[]', () => {
		const buffer = createTelemetryBuffer();
		buffer.push(makeRenderEvt());
		const json = serializeBuffer(buffer);
		const replay = createReplaySubsystem(makeConfig(), buffer);
		const sessions = replay.fromSerialized(json);
		expect(sessions.length).toBeGreaterThan(0);
	});

	it('engine(source) returns ReplayEngine', () => {
		const buffer = createTelemetryBuffer();
		buffer.push(makeRenderEvt());
		const replay = createReplaySubsystem(makeConfig(), buffer);
		const sessions = replay.fromBuffer();
		const engine = replay.engine({ type: 'events', events: [makeRenderEvt()] });
		expect(engine).toBeDefined();
		expect(typeof engine.navigate).toBe('object');
		void sessions;
	});

	it('engine({ type: "events", events: [] }) throws RenderKitError REPLAY_FAILED', () => {
		const buffer = createTelemetryBuffer();
		const replay = createReplaySubsystem(makeConfig(), buffer);
		expect(() => replay.engine({ type: 'events', events: [] })).toThrow(RenderKitError);
		try {
			replay.engine({ type: 'events', events: [] });
		} catch (e) {
			expect((e as RenderKitError).code).toBe('REPLAY_FAILED');
		}
	});
});

describe('createDisabledReplay', () => {
	it('fromBuffer() returns []', () => {
		const replay = createDisabledReplay();
		expect(replay.fromBuffer()).toEqual([]);
	});

	it('engine() throws RenderKitError DISABLED', () => {
		const replay = createDisabledReplay();
		expect(() => replay.engine({ type: 'events', events: [] })).toThrow(RenderKitError);
		try {
			replay.engine({ type: 'events', events: [] });
		} catch (e) {
			expect((e as RenderKitError).code).toBe('DISABLED');
		}
	});
});
