import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRenderKit } from '../src/factory/kit-factory.js';
import { RenderKitError } from '../src/errors/kit-error.js';
import { makePlugin, makeRenderEvent, resetSeq } from './helpers.js';
import * as telemetryCore from '@sapanmozammel/render-telemetry-core';

beforeEach(() => {
	resetSeq();
	vi.restoreAllMocks();
});

describe('createRenderKit', () => {
	it('returns frozen object', () => {
		const kit = createRenderKit();
		expect(Object.isFrozen(kit)).toBe(true);
		kit.destroy();
	});

	it('enabled: false → kit.enabled === false', () => {
		const kit = createRenderKit({ enabled: false });
		expect(kit.enabled).toBe(false);
	});

	it('enabled: false → kit.analyze() throws RenderKitError DISABLED', () => {
		const kit = createRenderKit({ enabled: false });
		expect(() => kit.analyze()).toThrow(RenderKitError);
		try {
			kit.analyze();
		} catch (e) {
			expect((e as RenderKitError).code).toBe('DISABLED');
		}
	});

	it('enabled: false → kit.replay.fromBuffer() returns []', () => {
		const kit = createRenderKit({ enabled: false });
		expect(kit.replay.fromBuffer()).toEqual([]);
	});

	it('enabled: false → kit.telemetry.buffer.push() is a no-op (snapshot unchanged)', () => {
		const kit = createRenderKit({ enabled: false });
		const before = kit.telemetry.snapshot();
		kit.telemetry.buffer.push(makeRenderEvent());
		const after = kit.telemetry.snapshot();
		expect(after.events).toHaveLength(0);
		expect(after).toBe(before);
	});

	it('enabled: false → createTelemetryBuffer is NOT called', () => {
		const spy = vi.spyOn(telemetryCore, 'createTelemetryBuffer');
		createRenderKit({ enabled: false });
		expect(spy).not.toHaveBeenCalled();
	});

	it('enabled: true → kit.telemetry.buffer is live (push → snapshot grows)', () => {
		const kit = createRenderKit();
		const event = makeRenderEvent();
		kit.telemetry.buffer.push(event);
		expect(kit.telemetry.snapshot().events).toHaveLength(1);
		kit.destroy();
	});

	it('createSession returns session with status active and matching componentName', () => {
		const kit = createRenderKit();
		const session = kit.telemetry.createSession('MyComponent');
		expect(session.status).toBe('active');
		expect(session.componentName).toBe('MyComponent');
		kit.destroy();
	});

	it('endSession returns session with status ended', () => {
		const kit = createRenderKit();
		const session = kit.telemetry.createSession('MyComponent');
		const ended = kit.telemetry.endSession(session);
		expect(ended.status).toBe('ended');
		kit.destroy();
	});

	it('registerTransport returns a deregistration function', () => {
		const kit = createRenderKit();
		const transport = telemetryCore.createMemoryTransport();
		const deregFn = kit.telemetry.registerTransport(transport);
		expect(typeof deregFn).toBe('function');
		deregFn();
		kit.destroy();
	});

	it('destroy() is idempotent — second call is a no-op, does not throw', () => {
		const kit = createRenderKit();
		expect(() => {
			kit.destroy();
			kit.destroy();
		}).not.toThrow();
	});

	it('destroy() calls onDestroy on each plugin in REVERSE order', () => {
		const callOrder: string[] = [];
		const p1 = makePlugin({
			id: 'p1',
			onDestroy: () => callOrder.push('p1'),
		});
		const p2 = makePlugin({
			id: 'p2',
			onDestroy: () => callOrder.push('p2'),
		});
		const kit = createRenderKit({ plugins: [p1, p2] });
		kit.destroy();
		expect(callOrder).toEqual(['p2', 'p1']);
	});

	it('onInit called on each plugin in FORWARD order during createRenderKit', () => {
		const callOrder: string[] = [];
		const p1 = makePlugin({ id: 'p1', onInit: () => callOrder.push('p1') });
		const p2 = makePlugin({ id: 'p2', onInit: () => callOrder.push('p2') });
		const kit = createRenderKit({ plugins: [p1, p2] });
		expect(callOrder).toEqual(['p1', 'p2']);
		kit.destroy();
	});

	it('plugin onInit error → logged, does not abort factory, subsequent plugins still run', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const ran: string[] = [];
		const pBad = makePlugin({ id: 'bad', onInit: () => { throw new Error('boom'); } });
		const pGood = makePlugin({ id: 'good', onInit: () => ran.push('good') });
		const kit = createRenderKit({ plugins: [pBad, pGood] });
		expect(ran).toContain('good');
		expect(errorSpy).toHaveBeenCalled();
		kit.destroy();
	});

	it('plugin onDestroy error → logged, does not abort teardown, subsequent plugins still run', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const destroyed: string[] = [];
		// p2 destroys first (reverse order), p2 throws, p1 still runs
		const p1 = makePlugin({ id: 'p1', onDestroy: () => destroyed.push('p1') });
		const p2 = makePlugin({ id: 'p2', onDestroy: () => { throw new Error('boom'); } });
		const kit = createRenderKit({ plugins: [p1, p2] });
		kit.destroy();
		expect(destroyed).toContain('p1');
		expect(errorSpy).toHaveBeenCalled();
	});

	it('two kit instances do not share buffers', () => {
		const kit1 = createRenderKit();
		const kit2 = createRenderKit();
		kit1.telemetry.buffer.push(makeRenderEvent());
		expect(kit1.telemetry.snapshot().events).toHaveLength(1);
		expect(kit2.telemetry.snapshot().events).toHaveLength(0);
		kit1.destroy();
		kit2.destroy();
	});

	it('two kit instances with same transport: kit1.destroy() does NOT remove transport registered by kit2', () => {
		const transport = telemetryCore.createMemoryTransport();
		const kit1 = createRenderKit({ telemetry: { transports: [transport] } });
		const kit2 = createRenderKit({ telemetry: { transports: [transport] } });
		kit1.destroy();
		// kit2 can still register a new transport (transport registry still functional)
		const deregFn = kit2.telemetry.registerTransport(telemetryCore.createMemoryTransport());
		expect(typeof deregFn).toBe('function');
		deregFn();
		kit2.destroy();
	});

	it('destroy() after analyze() and replay.fromBuffer() — no error; subsequent calls behave correctly', () => {
		const kit = createRenderKit();
		kit.telemetry.buffer.push(makeRenderEvent());
		kit.replay.fromBuffer();
		expect(() => kit.analyze()).not.toThrow();
		kit.destroy();
		// After destroy, replay.fromBuffer returns [] (buffer cleared)
		expect(kit.replay.fromBuffer()).toEqual([]);
	});
});
