import { describe, it, expect } from 'vitest';
import { fromEvents, fromBuffer, fromSerialized, createReplayEngine, buildReplaySessions } from '../src/index.js';
import { ReplayError } from '../src/errors/replay-error.js';
import { makeSessionEvents } from './helpers.js';
import { createTelemetryBuffer, serializeBuffer } from '@sapanmozammel/render-telemetry-core';

describe('fromEvents', () => {
	it('returns a ReplayEventsSource with type events', () => {
		const events = makeSessionEvents(3);
		const source = fromEvents(events);
		expect(source.type).toBe('events');
		expect(source.events).toBe(events);
	});
});

describe('fromBuffer', () => {
	it('returns a ReplayBufferSource with type buffer', () => {
		const buffer = createTelemetryBuffer();
		const source = fromBuffer(buffer);
		expect(source.type).toBe('buffer');
		expect(source.buffer).toBe(buffer);
	});

	it('engine built from buffer reads events from snapshot', () => {
		const buffer = createTelemetryBuffer();
		const events = makeSessionEvents(5);
		for (const event of events) buffer.push(event);

		const engine = createReplayEngine(fromBuffer(buffer));
		expect(engine.session.frameCount).toBe(5);
	});
});

describe('fromSerialized', () => {
	it('returns a ReplaySerializedSource with type serialized', () => {
		const source = fromSerialized('{"events":[]}');
		expect(source.type).toBe('serialized');
		expect(source.json).toBe('{"events":[]}');
	});

	it('engine built from valid serialized JSON works', () => {
		const buffer = createTelemetryBuffer();
		const events = makeSessionEvents(4);
		for (const event of events) buffer.push(event);
		const json = serializeBuffer(buffer);

		const engine = createReplayEngine(fromSerialized(json));
		expect(engine.session.frameCount).toBe(4);
	});

	it('throws INVALID_SERIALIZED_JSON for malformed JSON', () => {
		expect(() => createReplayEngine(fromSerialized('{bad json}'))).toThrow(ReplayError);
		try {
			createReplayEngine(fromSerialized('{bad json}'));
		} catch (err) {
			expect((err as ReplayError).code).toBe('INVALID_SERIALIZED_JSON');
		}
	});
});

describe('multi-session sources', () => {
	it('buildReplaySessions returns all sessions', () => {
		const eventsA = makeSessionEvents(3, { componentName: 'A' });
		const eventsB = makeSessionEvents(3, { componentName: 'B' });
		const sessions = buildReplaySessions(fromEvents([...eventsA, ...eventsB]));
		expect(sessions).toHaveLength(2);
	});

	it('sessions sorted by startedAt ascending', () => {
		const eventsA = makeSessionEvents(2, { componentName: 'A' });
		const eventsB = makeSessionEvents(2, { componentName: 'B' });
		const sessions = buildReplaySessions(fromEvents([...eventsA, ...eventsB]));
		expect(sessions[0]!.startedAt).toBeLessThanOrEqual(sessions[1]!.startedAt);
	});

	it('createReplayEngine throws MULTIPLE_SESSIONS when no sessionId provided', () => {
		const eventsA = makeSessionEvents(2, { componentName: 'A' });
		const eventsB = makeSessionEvents(2, { componentName: 'B' });
		try {
			createReplayEngine(fromEvents([...eventsA, ...eventsB]));
			expect(true).toBe(false); // should not reach
		} catch (err) {
			expect(err).toBeInstanceOf(ReplayError);
			expect((err as ReplayError).code).toBe('MULTIPLE_SESSIONS');
		}
	});

	it('createReplayEngine selects correct session by id', () => {
		const eventsA = makeSessionEvents(2, { componentName: 'Alpha' });
		const eventsB = makeSessionEvents(2, { componentName: 'Beta' });
		const sessions = buildReplaySessions(fromEvents([...eventsA, ...eventsB]));
		const engine = createReplayEngine(fromEvents([...eventsA, ...eventsB]), sessions[0]!.id);
		expect(engine.session.id).toBe(sessions[0]!.id);
	});

	it('createReplayEngine throws SESSION_NOT_FOUND for unknown sessionId', () => {
		const events = makeSessionEvents(2);
		try {
			createReplayEngine(fromEvents(events), 'non-existent-id');
			expect(true).toBe(false);
		} catch (err) {
			expect((err as ReplayError).code).toBe('SESSION_NOT_FOUND');
		}
	});
});
