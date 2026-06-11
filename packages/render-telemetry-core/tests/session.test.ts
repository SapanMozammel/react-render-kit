import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTelemetrySession, endTelemetrySession } from '../src/index.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('createTelemetrySession', () => {
	it('creates session with correct componentName', () => {
		const session = createTelemetrySession('UserCard');
		expect(session.componentName).toBe('UserCard');
	});

	it('status is active', () => {
		const session = createTelemetrySession('Foo');
		expect(session.status).toBe('active');
	});

	it('sequenceCounter starts at 0', () => {
		const session = createTelemetrySession('Foo');
		expect(session.sequenceCounter).toBe(0);
	});

	it('endTimestamp is null', () => {
		const session = createTelemetrySession('Foo');
		expect(session.endTimestamp).toBeNull();
	});

	it('endWallTimestamp is null', () => {
		const session = createTelemetrySession('Foo');
		expect(session.endWallTimestamp).toBeNull();
	});

	it('id is a non-empty string', () => {
		const session = createTelemetrySession('Foo');
		expect(typeof session.id).toBe('string');
		expect(session.id.length).toBeGreaterThan(0);
	});

	it('startTimestamp is a number', () => {
		const session = createTelemetrySession('Foo');
		expect(typeof session.startTimestamp).toBe('number');
	});

	it('startWallTimestamp is a number', () => {
		const session = createTelemetrySession('Foo');
		expect(typeof session.startWallTimestamp).toBe('number');
	});

	it('each call produces a unique id', () => {
		const a = createTelemetrySession('Foo');
		const b = createTelemetrySession('Foo');
		expect(a.id).not.toBe(b.id);
	});
});

describe('endTelemetrySession', () => {
	it('returns a new object reference', () => {
		const session = createTelemetrySession('Foo');
		const ended = endTelemetrySession(session);
		expect(ended).not.toBe(session);
	});

	it('status becomes ended', () => {
		const session = createTelemetrySession('Foo');
		const ended = endTelemetrySession(session);
		expect(ended.status).toBe('ended');
	});

	it('endTimestamp is set to a number', () => {
		const session = createTelemetrySession('Foo');
		const ended = endTelemetrySession(session);
		expect(typeof ended.endTimestamp).toBe('number');
	});

	it('endWallTimestamp is set to a number', () => {
		const session = createTelemetrySession('Foo');
		const ended = endTelemetrySession(session);
		expect(typeof ended.endWallTimestamp).toBe('number');
	});

	it('preserves id and componentName', () => {
		const session = createTelemetrySession('UserCard');
		const ended = endTelemetrySession(session);
		expect(ended.id).toBe(session.id);
		expect(ended.componentName).toBe(session.componentName);
	});

	it('preserves sequenceCounter', () => {
		const session = createTelemetrySession('Foo');
		const ended = endTelemetrySession(session);
		expect(ended.sequenceCounter).toBe(session.sequenceCounter);
	});

	it('does not mutate input session', () => {
		const session = createTelemetrySession('Foo');
		endTelemetrySession(session);
		expect(session.status).toBe('active');
		expect(session.endTimestamp).toBeNull();
	});

	it('calling on already-ended session emits console.warn and returns same reference', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const session = createTelemetrySession('Foo');
		const ended = endTelemetrySession(session);
		const doubleEnded = endTelemetrySession(ended);
		expect(warnSpy).toHaveBeenCalledOnce();
		expect(doubleEnded).toBe(ended);
	});
});
