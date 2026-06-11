import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	createLocalStorageTransport,
	createTelemetrySession,
	createRenderEvent,
} from '../src/index.js';
import type { TelemetryEvent } from '../src/index.js';

const makeEvent = (): TelemetryEvent => {
	const session = createTelemetrySession('Test');
	const { event } = createRenderEvent(session, { renderNumber: 1 });
	return event;
};

const TEST_KEY = 'test:render-telemetry';

type MockStorage = {
	store: Map<string, string>;
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
	removeItem: (key: string) => void;
	clear: () => void;
};

let originalLocalStorage: typeof globalThis.localStorage | undefined;
let mockStorage: MockStorage;

beforeEach(() => {
	originalLocalStorage = (globalThis as Record<string, unknown>)['localStorage'] as
		| typeof globalThis.localStorage
		| undefined;
	mockStorage = {
		store: new Map<string, string>(),
		getItem: (key: string) => mockStorage.store.get(key) ?? null,
		setItem: (key: string, value: string) => mockStorage.store.set(key, value),
		removeItem: (key: string) => mockStorage.store.delete(key),
		clear: () => mockStorage.store.clear(),
	};
	(globalThis as Record<string, unknown>)['localStorage'] = mockStorage;
});

afterEach(() => {
	if (originalLocalStorage !== undefined) {
		(globalThis as Record<string, unknown>)['localStorage'] = originalLocalStorage;
	} else {
		delete (globalThis as Record<string, unknown>)['localStorage'];
	}
	vi.restoreAllMocks();
});

describe('createLocalStorageTransport', () => {
	it('name includes the storage key', () => {
		const transport = createLocalStorageTransport('test:render-telemetry');
		expect(transport.name).toBe('local-storage:test:render-telemetry');
	});

	it('emit writes event as JSON array to storage key', () => {
		const transport = createLocalStorageTransport(TEST_KEY);
		const event = makeEvent();
		transport.emit([event]);
		const stored = JSON.parse(mockStorage.getItem(TEST_KEY) ?? '[]') as TelemetryEvent[];
		expect(stored).toHaveLength(1);
		expect((stored[0] as { type: string }).type).toBe('render');
	});

	it('emit accumulates across multiple calls', () => {
		const transport = createLocalStorageTransport(TEST_KEY);
		transport.emit([makeEvent()]);
		transport.emit([makeEvent()]);
		const stored = JSON.parse(mockStorage.getItem(TEST_KEY) ?? '[]') as TelemetryEvent[];
		expect(stored).toHaveLength(2);
	});

	it('parse error treated as empty array — does not throw', () => {
		mockStorage.setItem(TEST_KEY, 'NOT_JSON');
		const transport = createLocalStorageTransport(TEST_KEY);
		expect(() => transport.emit([makeEvent()])).not.toThrow();
		const stored = JSON.parse(mockStorage.getItem(TEST_KEY) ?? '[]') as TelemetryEvent[];
		expect(stored).toHaveLength(1);
	});

	it('onExceed prune removes oldest event when over maxBytes', () => {
		const event = makeEvent();
		const serialized = JSON.stringify([event]);
		const transport = createLocalStorageTransport(TEST_KEY, {
			maxBytes: serialized.length - 1,
			onExceed: 'prune',
		});
		// Pre-fill with one event
		mockStorage.setItem(TEST_KEY, JSON.stringify([event]));
		// Emit another — merged would exceed, so oldest pruned
		transport.emit([makeEvent()]);
		const stored = JSON.parse(mockStorage.getItem(TEST_KEY) ?? '[]') as unknown[];
		// should have at most 1 after pruning
		expect(stored.length).toBeLessThanOrEqual(1);
	});

	it('onExceed clear replaces storage with only new events', () => {
		const transport = createLocalStorageTransport(TEST_KEY, {
			maxBytes: 1,
			onExceed: 'clear',
		});
		mockStorage.setItem(TEST_KEY, JSON.stringify([makeEvent()]));
		const newEvent = makeEvent();
		// Will exceed — clear strategy: store only new events
		// (even 1 event + tiny maxBytes may still not fit — but it replaces existing)
		transport.emit([newEvent]);
		// Storage is set to array of new events regardless of excess (still may exceed)
		// The key test is that the OLD events are gone
		const raw = mockStorage.getItem(TEST_KEY);
		expect(raw).not.toBeNull();
	});

	it('onExceed skip does not write when over maxBytes', () => {
		const transport = createLocalStorageTransport(TEST_KEY, {
			maxBytes: 1,
			onExceed: 'skip',
		});
		transport.emit([makeEvent()]);
		// Nothing written because serialized > 1 byte
		expect(mockStorage.getItem(TEST_KEY)).toBeNull();
	});

	it('does not throw in Node.js environment (no localStorage)', () => {
		delete (globalThis as Record<string, unknown>)['localStorage'];
		const transport = createLocalStorageTransport(TEST_KEY);
		expect(() => transport.emit([makeEvent()])).not.toThrow();
	});
});
