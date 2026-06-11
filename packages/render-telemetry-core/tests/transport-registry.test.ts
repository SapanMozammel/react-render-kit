import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	registerTransport,
	unregisterAllTransports,
	emitEvents,
	createMemoryTransport,
	createTelemetrySession,
	createRenderEvent,
} from '../src/index.js';
import type { TelemetryEvent } from '../src/index.js';

const makeEvent = (): TelemetryEvent => {
	const session = createTelemetrySession('Test');
	const { event } = createRenderEvent(session, { renderNumber: 1 });
	return event;
};

afterEach(() => {
	unregisterAllTransports();
	vi.restoreAllMocks();
});

describe('registerTransport', () => {
	it('returns an unregister function', () => {
		const transport = createMemoryTransport();
		const unregister = registerTransport(transport);
		expect(typeof unregister).toBe('function');
	});

	it('calling unregister stops transport from receiving events', () => {
		const transport = createMemoryTransport();
		const unregister = registerTransport(transport);
		unregister();
		emitEvents([makeEvent()]);
		expect(transport.getEmitted()).toHaveLength(0);
	});
});

describe('emitEvents', () => {
	it('dispatches events to all registered transports', () => {
		const t1 = createMemoryTransport();
		const t2 = createMemoryTransport();
		registerTransport(t1);
		registerTransport(t2);
		const event = makeEvent();
		emitEvents([event]);
		expect(t1.getEmitted()).toHaveLength(1);
		expect(t2.getEmitted()).toHaveLength(1);
	});

	it('transport error does not prevent other transports from receiving events', () => {
		const throwing = {
			name: 'throwing',
			emit: () => {
				throw new Error('intentional failure');
			},
		};
		const good = createMemoryTransport();
		registerTransport(throwing);
		registerTransport(good);
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(() => emitEvents([makeEvent()])).not.toThrow();
		expect(good.getEmitted()).toHaveLength(1);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('throwing'));
	});

	it('no error when registry is empty', () => {
		expect(() => emitEvents([makeEvent()])).not.toThrow();
	});
});

describe('unregisterAllTransports', () => {
	it('empties the registry so no transports receive events', () => {
		const t1 = createMemoryTransport();
		const t2 = createMemoryTransport();
		registerTransport(t1);
		registerTransport(t2);
		unregisterAllTransports();
		emitEvents([makeEvent()]);
		expect(t1.getEmitted()).toHaveLength(0);
		expect(t2.getEmitted()).toHaveLength(0);
	});
});
