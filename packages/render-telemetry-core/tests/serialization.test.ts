import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	createTelemetrySession,
	endTelemetrySession,
	createSessionStartEvent,
	createRenderEvent,
	createPropChangeEvent,
	createFrequencyEvent,
	createScoreEvent,
	createRecommendationEvent,
	createSessionEndEvent,
	serializeSession,
	deserializeSession,
	serializeBuffer,
	deserializeBuffer,
	createTelemetryBuffer,
} from '../src/index.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('serializeSession / deserializeSession', () => {
	it('round-trips a session', () => {
		const session = createTelemetrySession('UserCard');
		const json = serializeSession(session);
		const restored = deserializeSession(json);
		expect(restored).not.toBeNull();
		expect(restored?.id).toBe(session.id);
		expect(restored?.componentName).toBe(session.componentName);
		expect(restored?.status).toBe(session.status);
	});

	it('returns null for invalid JSON', () => {
		expect(deserializeSession('NOT JSON')).toBeNull();
	});

	it('returns null for valid JSON with wrong shape', () => {
		expect(deserializeSession('{"no":"required-fields"}')).toBeNull();
	});

	it('returns null for empty string', () => {
		expect(deserializeSession('')).toBeNull();
	});
});

describe('serializeBuffer / deserializeBuffer — round-trip', () => {
	it('restores all 7 event types', () => {
		let session = createTelemetrySession('Widget');
		const buffer = createTelemetryBuffer();
		buffer.pushSession(session);

		const r0 = createSessionStartEvent(session);
		buffer.push(r0.event);
		session = r0.session;

		const r1 = createRenderEvent(session, { renderNumber: 1, triggeredBy: 'props' });
		buffer.push(r1.event);
		session = r1.session;

		const r2 = createPropChangeEvent(session, {
			renderNumber: 1,
			changed: [{ kind: 'value-changed', key: 'x', prev: 1, next: 2 }],
			unstable: [],
			inferredTrigger: 'genuine-prop-change',
			signalKind: 'genuine',
		});
		buffer.push(r2.event);
		session = r2.session;

		const r3 = createFrequencyEvent(session, {
			renderNumber: 1,
			windowMs: 10000,
			windowCount: 2,
			rate: 0.2,
			classification: 'LOW',
			totalRenders: 2,
		});
		buffer.push(r3.event);
		session = r3.session;

		const r4 = createScoreEvent(session, {
			renderNumber: 1,
			score: 90,
			grade: 'EXCELLENT',
			frequencyPenalty: 0,
			instabilityPenalty: 0,
			memoPenalty: 0,
			mixedSignalPenalty: 0,
			memoClassification: 'NOT_APPLICABLE',
			signalKind: null,
		});
		buffer.push(r4.event);
		session = r4.session;

		const r5 = createRecommendationEvent(session, {
			renderNumber: 1,
			recommendations: ['No issues found'],
		});
		buffer.push(r5.event);
		session = r5.session;

		const endedSession = endTelemetrySession(session);
		const r6 = createSessionEndEvent(endedSession, { totalRenders: 6, finalScore: 90 });
		buffer.push(r6.event);
		buffer.updateSession(endedSession);

		const json = serializeBuffer(buffer);
		const restored = deserializeBuffer(json);

		expect(restored.getSnapshot().events).toHaveLength(7);
		const types = restored.getSnapshot().events.map((e) => e.type);
		expect(types).toContain('session-start');
		expect(types).toContain('render');
		expect(types).toContain('prop-change');
		expect(types).toContain('frequency');
		expect(types).toContain('score');
		expect(types).toContain('recommendation');
		expect(types).toContain('session-end');
	});

	it('returns empty buffer for invalid JSON', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const buffer = deserializeBuffer('NOT JSON');
		expect(buffer.getSnapshot().events).toHaveLength(0);
		expect(warnSpy).toHaveBeenCalled();
	});

	it('returns empty buffer for empty object JSON', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const buffer = deserializeBuffer('{}');
		expect(buffer.getSnapshot().events).toHaveLength(0);
		expect(warnSpy).toHaveBeenCalled();
	});

	it('does not throw on any malformed input', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(() => deserializeBuffer('')).not.toThrow();
		expect(() => deserializeBuffer('null')).not.toThrow();
		expect(() => deserializeBuffer('[]')).not.toThrow();
		expect(warnSpy).toHaveBeenCalled();
	});

	it('warns once for unknown schemaVersion and still hydrates valid events', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const session = createTelemetrySession('Foo');
		const buffer = createTelemetryBuffer();
		const { event, session: s1 } = createSessionStartEvent(session);
		buffer.push(event);
		buffer.pushSession(s1);

		const json = serializeBuffer(buffer);
		const parsed = JSON.parse(json) as Record<string, unknown>;
		parsed['schemaVersion'] = '0.9.0';
		const modifiedJson = JSON.stringify(parsed);

		const restored = deserializeBuffer(modifiedJson);
		expect(warnSpy).toHaveBeenCalledOnce();
		expect(restored.getSnapshot().events).toHaveLength(1);
	});

	it('skips invalid events in array', () => {
		const session = createTelemetrySession('Foo');
		const buffer = createTelemetryBuffer();
		const { event } = createSessionStartEvent(session);
		buffer.push(event);

		const json = serializeBuffer(buffer);
		const parsed = JSON.parse(json) as { events: unknown[] };
		parsed.events.push({ type: 'render' }); // missing required fields
		const modifiedJson = JSON.stringify(parsed);

		const restored = deserializeBuffer(modifiedJson);
		expect(restored.getSnapshot().events).toHaveLength(1); // only valid event
	});

	it('skips invalid sessions in sessions object', () => {
		const session = createTelemetrySession('Foo');
		const buffer = createTelemetryBuffer();
		buffer.pushSession(session);

		const json = serializeBuffer(buffer);
		const parsed = JSON.parse(json) as { sessions: Record<string, unknown> };
		parsed.sessions['bad-session'] = { id: '' }; // invalid: empty id
		const modifiedJson = JSON.stringify(parsed);

		const restored = deserializeBuffer(modifiedJson);
		// Only valid session hydrated
		expect(Object.keys(restored.getSnapshot().sessions)).toHaveLength(1);
	});
});
