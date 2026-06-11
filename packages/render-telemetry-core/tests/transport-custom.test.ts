import { describe, it, expect, vi } from 'vitest';
import { createCustomTransport, createTelemetrySession, createRenderEvent, type TelemetryEvent } from '../src/index.js';

const makeEvent = (): TelemetryEvent => {
	const session = createTelemetrySession('Test');
	const { event } = createRenderEvent(session, { renderNumber: 1 });
	return event;
};

describe('createCustomTransport', () => {
	it('name matches provided name', () => {
		const transport = createCustomTransport('my-custom', vi.fn());
		expect(transport.name).toBe('my-custom');
	});

	it('emit callback is invoked with correct events', () => {
		const callback = vi.fn();
		const transport = createCustomTransport('test', callback);
		const event = makeEvent();
		transport.emit([event]);
		expect(callback).toHaveBeenCalledOnce();
		expect(callback).toHaveBeenCalledWith([event]);
	});

	it('each emit call receives only that batch (no accumulation)', () => {
		const batches: ReadonlyArray<TelemetryEvent>[] = [];
		const transport = createCustomTransport('test', (events) => {
			batches.push(events);
		});
		transport.emit([makeEvent()]);
		transport.emit([makeEvent(), makeEvent()]);
		expect(batches).toHaveLength(2);
		expect(batches[0]).toHaveLength(1);
		expect(batches[1]).toHaveLength(2);
	});

	it('emit is the provided callback reference', () => {
		const callback = vi.fn();
		const transport = createCustomTransport('test', callback);
		expect(transport.emit).toBe(callback);
	});
});
