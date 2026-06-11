import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	createTelemetryBuffer,
	createTelemetrySession,
	createSessionStartEvent,
	createRenderEvent,
	createScoreEvent,
} from '../src/index.js';
import type { TelemetryEvent } from '../src/index.js';

const makeSession = (name = 'TestComponent') => createTelemetrySession(name);

const makeRenderEvent = (sessionArg = makeSession()): TelemetryEvent => {
	const { event } = createRenderEvent(sessionArg, { renderNumber: 1 });
	return event;
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('createTelemetryBuffer — empty state', () => {
	it('getSnapshot returns empty events and sessions', () => {
		const buffer = createTelemetryBuffer();
		const snap = buffer.getSnapshot();
		expect(snap.events).toHaveLength(0);
		expect(Object.keys(snap.sessions)).toHaveLength(0);
	});

	it('getServerSnapshot returns same reference on repeated calls', () => {
		const buffer = createTelemetryBuffer();
		expect(buffer.getServerSnapshot()).toBe(buffer.getServerSnapshot());
	});

	it('getSnapshot returns same reference on repeated calls without mutation', () => {
		const buffer = createTelemetryBuffer();
		const snap1 = buffer.getSnapshot();
		const snap2 = buffer.getSnapshot();
		expect(snap1).toBe(snap2);
	});
});

describe('push', () => {
	it('push adds event to snapshot', () => {
		const buffer = createTelemetryBuffer();
		const event = makeRenderEvent();
		buffer.push(event);
		expect(buffer.getSnapshot().events).toHaveLength(1);
		expect(buffer.getSnapshot().events[0]).toBe(event);
	});

	it('push changes snapshot reference', () => {
		const buffer = createTelemetryBuffer();
		const before = buffer.getSnapshot();
		buffer.push(makeRenderEvent());
		expect(buffer.getSnapshot()).not.toBe(before);
	});

	it('evicts oldest events when maxEvents exceeded', () => {
		const buffer = createTelemetryBuffer({ maxEvents: 3 });
		for (let i = 0; i < 4; i++) {
			const session = makeSession();
			const { event } = createRenderEvent(session, { renderNumber: i + 1 });
			buffer.push(event);
		}
		expect(buffer.getSnapshot().events).toHaveLength(3);
		// first event should be gone — renderNumber 1
		const renderNums = (buffer.getSnapshot().events as Extract<TelemetryEvent, { type: 'render' }>[]).map(
			(e) => e.renderNumber,
		);
		expect(renderNums).not.toContain(1);
		expect(renderNums).toContain(4);
	});
});

describe('pushSession / updateSession', () => {
	it('pushSession stores session by id', () => {
		const buffer = createTelemetryBuffer();
		const session = makeSession('MyComp');
		buffer.pushSession(session);
		expect(buffer.getSnapshot().sessions[session.id]).toBe(session);
	});

	it('updateSession upserts by id', () => {
		const buffer = createTelemetryBuffer();
		const session = makeSession('MyComp');
		buffer.pushSession(session);
		const updated = { ...session, sequenceCounter: 5 };
		buffer.updateSession(updated);
		expect(buffer.getSnapshot().sessions[session.id]?.sequenceCounter).toBe(5);
	});
});

describe('clear', () => {
	it('resets events to empty', () => {
		const buffer = createTelemetryBuffer();
		buffer.push(makeRenderEvent());
		buffer.clear();
		expect(buffer.getSnapshot().events).toHaveLength(0);
	});

	it('resets sessions to empty', () => {
		const buffer = createTelemetryBuffer();
		buffer.pushSession(makeSession());
		buffer.clear();
		expect(Object.keys(buffer.getSnapshot().sessions)).toHaveLength(0);
	});

	it('getSnapshot after clear is SERVER_SNAPSHOT (same as getServerSnapshot)', () => {
		const buffer = createTelemetryBuffer();
		buffer.push(makeRenderEvent());
		buffer.clear();
		expect(buffer.getSnapshot()).toBe(buffer.getServerSnapshot());
	});
});

describe('subscribe / notify', () => {
	it('listener is called on push', () => {
		const buffer = createTelemetryBuffer();
		const listener = vi.fn();
		buffer.subscribe(listener);
		buffer.push(makeRenderEvent());
		expect(listener).toHaveBeenCalledOnce();
	});

	it('listener is called on pushSession', () => {
		const buffer = createTelemetryBuffer();
		const listener = vi.fn();
		buffer.subscribe(listener);
		buffer.pushSession(makeSession());
		expect(listener).toHaveBeenCalledOnce();
	});

	it('listener is called on updateSession', () => {
		const buffer = createTelemetryBuffer();
		const listener = vi.fn();
		buffer.subscribe(listener);
		buffer.updateSession(makeSession());
		expect(listener).toHaveBeenCalledOnce();
	});

	it('listener is called on clear', () => {
		const buffer = createTelemetryBuffer();
		const listener = vi.fn();
		buffer.subscribe(listener);
		buffer.clear();
		expect(listener).toHaveBeenCalledOnce();
	});

	it('unsubscribe stops notifications', () => {
		const buffer = createTelemetryBuffer();
		const listener = vi.fn();
		const unsub = buffer.subscribe(listener);
		unsub();
		buffer.push(makeRenderEvent());
		expect(listener).not.toHaveBeenCalled();
	});
});

describe('query methods', () => {
	it('getEventsBySession filters by sessionId', () => {
		const buffer = createTelemetryBuffer();
		const s1 = makeSession('Comp1');
		const s2 = makeSession('Comp2');
		const { event: e1 } = createRenderEvent(s1, { renderNumber: 1 });
		const { event: e2 } = createRenderEvent(s2, { renderNumber: 1 });
		buffer.push(e1);
		buffer.push(e2);
		const result = buffer.getEventsBySession(s1.id);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(e1);
	});

	it('getEventsByComponent filters by componentName', () => {
		const buffer = createTelemetryBuffer();
		const s1 = makeSession('Alpha');
		const s2 = makeSession('Beta');
		const { event: e1 } = createRenderEvent(s1, { renderNumber: 1 });
		const { event: e2 } = createRenderEvent(s2, { renderNumber: 1 });
		buffer.push(e1);
		buffer.push(e2);
		const result = buffer.getEventsByComponent('Alpha');
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(e1);
	});

	it('getEventsByType filters by type', () => {
		const buffer = createTelemetryBuffer();
		const session = makeSession();
		const { event: startEv, session: s1 } = createSessionStartEvent(session);
		const { event: renderEv } = createRenderEvent(s1, { renderNumber: 1 });
		buffer.push(startEv);
		buffer.push(renderEv);
		const renderEvents = buffer.getEventsByType('render');
		expect(renderEvents).toHaveLength(1);
		expect(renderEvents[0]?.type).toBe('render');
	});

	it('getSession returns session by id', () => {
		const buffer = createTelemetryBuffer();
		const session = makeSession('Foo');
		buffer.pushSession(session);
		expect(buffer.getSession(session.id)).toBe(session);
	});

	it('getSession returns undefined for unknown id', () => {
		const buffer = createTelemetryBuffer();
		expect(buffer.getSession('no-such-id')).toBeUndefined();
	});

	it('getSessionsByComponent filters by componentName', () => {
		const buffer = createTelemetryBuffer();
		const s1 = makeSession('Widget');
		const s2 = makeSession('Button');
		const s3 = makeSession('Widget');
		buffer.pushSession(s1);
		buffer.pushSession(s2);
		buffer.pushSession(s3);
		const result = buffer.getSessionsByComponent('Widget');
		expect(result).toHaveLength(2);
	});
});

describe('maxEvents clamping', () => {
	it('clamps maxEvents 0 to 1 and warns', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const buffer = createTelemetryBuffer({ maxEvents: 0 });
		buffer.push(makeRenderEvent());
		buffer.push(makeRenderEvent());
		expect(warnSpy).toHaveBeenCalledOnce();
		expect(buffer.getSnapshot().events).toHaveLength(1);
	});
});
