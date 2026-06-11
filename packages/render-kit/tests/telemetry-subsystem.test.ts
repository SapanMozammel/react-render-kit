import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTelemetryBuffer } from '@sapanmozammel/render-telemetry-core';
import { createTelemetrySubsystem, createDisabledTelemetry, DISABLED_BUFFER } from '../src/subsystems/telemetry.js';
import { makeRenderEvent, resetSeq } from './helpers.js';

beforeEach(() => {
	resetSeq();
	vi.restoreAllMocks();
});

const makeConfig = (overrides?: Partial<{ enabled: boolean; maxEvents: number; transports: [] }>) => ({
	enabled: true,
	maxEvents: 1000,
	transports: [] as const,
	...overrides,
});

describe('createTelemetrySubsystem', () => {
	it('returns object with all required fields present', () => {
		const buffer = createTelemetryBuffer();
		const deregFns: Array<() => void> = [];
		const telemetry = createTelemetrySubsystem(makeConfig(), buffer, deregFns);
		expect(telemetry.enabled).toBe(true);
		expect(typeof telemetry.buffer).toBe('object');
		expect(typeof telemetry.createSession).toBe('function');
		expect(typeof telemetry.endSession).toBe('function');
		expect(typeof telemetry.registerTransport).toBe('function');
		expect(typeof telemetry.unregisterAllTransports).toBe('function');
		expect(typeof telemetry.snapshot).toBe('function');
		expect(typeof telemetry.serialize).toBe('function');
		expect(typeof telemetry.clear).toBe('function');
	});

	it('snapshot() returns buffer.getSnapshot()', () => {
		const buffer = createTelemetryBuffer();
		const deregFns: Array<() => void> = [];
		const telemetry = createTelemetrySubsystem(makeConfig(), buffer, deregFns);
		const snap = telemetry.snapshot();
		expect(snap).toBe(buffer.getSnapshot());
	});

	it('clear() empties the snapshot', () => {
		const buffer = createTelemetryBuffer();
		const deregFns: Array<() => void> = [];
		const telemetry = createTelemetrySubsystem(makeConfig(), buffer, deregFns);
		buffer.push(makeRenderEvent());
		expect(telemetry.snapshot().events).toHaveLength(1);
		telemetry.clear();
		expect(telemetry.snapshot().events).toHaveLength(0);
	});

	it('registerTransport returns a deregistration fn; calling it removes the transport', () => {
		const buffer = createTelemetryBuffer();
		const deregFns: Array<() => void> = [];
		const telemetry = createTelemetrySubsystem(makeConfig(), buffer, deregFns);
		const mockTransport = { name: 'test', emit: vi.fn() };
		const deregFn = telemetry.registerTransport(mockTransport);
		expect(typeof deregFn).toBe('function');
		expect(deregFns).toHaveLength(1);
		deregFn();
	});

	it('unregisterAllTransports() calls all tracked deregFns', () => {
		const buffer = createTelemetryBuffer();
		const deregFns: Array<() => void> = [];
		const telemetry = createTelemetrySubsystem(makeConfig(), buffer, deregFns);
		const fn1 = vi.fn();
		const fn2 = vi.fn();
		deregFns.push(fn1, fn2);
		telemetry.unregisterAllTransports();
		expect(fn1).toHaveBeenCalled();
		expect(fn2).toHaveBeenCalled();
		expect(deregFns).toHaveLength(0);
	});

	it('createSession(name) returns status: active, componentName === name', () => {
		const buffer = createTelemetryBuffer();
		const deregFns: Array<() => void> = [];
		const telemetry = createTelemetrySubsystem(makeConfig(), buffer, deregFns);
		const session = telemetry.createSession('MyComp');
		expect(session.status).toBe('active');
		expect(session.componentName).toBe('MyComp');
	});

	it('endSession(session) returns status: ended', () => {
		const buffer = createTelemetryBuffer();
		const deregFns: Array<() => void> = [];
		const telemetry = createTelemetrySubsystem(makeConfig(), buffer, deregFns);
		const session = telemetry.createSession('MyComp');
		const ended = telemetry.endSession(session);
		expect(ended.status).toBe('ended');
	});

	it('serialize() returns non-empty JSON string after events pushed to buffer', () => {
		const buffer = createTelemetryBuffer();
		const deregFns: Array<() => void> = [];
		const telemetry = createTelemetrySubsystem(makeConfig(), buffer, deregFns);
		buffer.push(makeRenderEvent());
		const serialized = telemetry.serialize();
		expect(typeof serialized).toBe('string');
		expect(serialized.length).toBeGreaterThan(0);
		const parsed = JSON.parse(serialized) as unknown;
		expect(parsed).toBeTruthy();
	});
});

describe('createDisabledTelemetry', () => {
	it('buffer.push() does NOT grow getSnapshot().events', () => {
		const telemetry = createDisabledTelemetry();
		telemetry.buffer.push(makeRenderEvent());
		expect(telemetry.buffer.getSnapshot().events).toHaveLength(0);
	});

	it('buffer.subscribe() returns a function; calling it does not throw', () => {
		const telemetry = createDisabledTelemetry();
		const unsubscribe = telemetry.buffer.subscribe(() => undefined);
		expect(typeof unsubscribe).toBe('function');
		expect(() => unsubscribe()).not.toThrow();
	});

	it('snapshot() returns { events: [], sessions: {} }', () => {
		const telemetry = createDisabledTelemetry();
		const snap = telemetry.snapshot();
		expect(snap.events).toHaveLength(0);
		expect(snap.sessions).toEqual({});
	});

	it('createSession(name) returns session with status active; uses DISABLED_BUFFER', () => {
		const telemetry = createDisabledTelemetry();
		const session = telemetry.createSession('MyComp');
		expect(session.status).toBe('active');
		expect(session.componentName).toBe('MyComp');
		// Verify it shares the DISABLED_BUFFER (not a real buffer)
		expect(telemetry.buffer).toBe(DISABLED_BUFFER);
	});
});
