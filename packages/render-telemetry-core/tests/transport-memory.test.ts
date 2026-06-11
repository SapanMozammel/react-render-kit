import { describe, it, expect } from 'vitest';
import { createMemoryTransport, createTelemetrySession, createRenderEvent, type TelemetryEvent } from '../src/index.js';

const makeEvent = (): TelemetryEvent => {
	const session = createTelemetrySession('Test');
	const { event } = createRenderEvent(session, { renderNumber: 1 });
	return event;
};

describe('createMemoryTransport', () => {
	it('name is memory', () => {
		const transport = createMemoryTransport();
		expect(transport.name).toBe('memory');
	});

	it('getEmitted returns empty array initially', () => {
		const transport = createMemoryTransport();
		expect(transport.getEmitted()).toHaveLength(0);
	});

	it('emit accumulates single event', () => {
		const transport = createMemoryTransport();
		const event = makeEvent();
		transport.emit([event]);
		expect(transport.getEmitted()).toHaveLength(1);
		expect(transport.getEmitted()[0]).toBe(event);
	});

	it('emit accumulates multiple events across calls', () => {
		const transport = createMemoryTransport();
		const a = makeEvent();
		const b = makeEvent();
		const c = makeEvent();
		transport.emit([a, b]);
		transport.emit([c]);
		const emitted = transport.getEmitted();
		expect(emitted).toHaveLength(3);
		expect(emitted[0]).toBe(a);
		expect(emitted[1]).toBe(b);
		expect(emitted[2]).toBe(c);
	});

	it('getEmitted returns stable reference between emits', () => {
		const transport = createMemoryTransport();
		const ref1 = transport.getEmitted();
		const ref2 = transport.getEmitted();
		expect(ref1).toBe(ref2);
	});

	it('getEmitted returns new reference after emit', () => {
		const transport = createMemoryTransport();
		const before = transport.getEmitted();
		transport.emit([makeEvent()]);
		expect(transport.getEmitted()).not.toBe(before);
	});

	it('clearEmitted resets to empty array', () => {
		const transport = createMemoryTransport();
		transport.emit([makeEvent()]);
		transport.clearEmitted();
		expect(transport.getEmitted()).toHaveLength(0);
	});

	it('has emit method (TelemetryTransport interface)', () => {
		const transport = createMemoryTransport();
		expect(typeof transport.emit).toBe('function');
	});
});
