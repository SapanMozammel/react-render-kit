import { describe, expect, it, vi } from 'vitest';
import { createPlaygroundStore } from '../../src/store/playground-store.js';
import type { InsightReport } from '@sapanmozammel/render-insights';

const makeReport = (overrides?: Partial<InsightReport>): InsightReport => ({
	componentName: 'TestComp',
	renderNumber: 1,
	reportNumber: 1,
	props: { changed: [], unstable: [] },
	frequency: { totalRenders: 1, windowCount: 1, windowMs: 1000, rate: 1, classification: 'LOW' },
	memo: { signalKind: null, sessionClass: 'NOT_APPLICABLE', genuineCount: 0, referenceOnlyCount: 0, mixedCount: 0 },
	score: 100,
	grade: 'EXCELLENT',
	inferredTrigger: 'no-prop-change',
	recommendations: [],
	...overrides,
});

describe('createPlaygroundStore', () => {
	it('starts with empty snapshot', () => {
		const store = createPlaygroundStore();
		expect(store.getSnapshot()).toEqual([]);
	});

	it('getServerSnapshot always returns empty array', () => {
		const store = createPlaygroundStore();
		store.push(makeReport());
		expect(store.getServerSnapshot()).toEqual([]);
	});

	it('push adds report to snapshot', () => {
		const store = createPlaygroundStore();
		const r = makeReport({ renderNumber: 1 });
		store.push(r);
		expect(store.getSnapshot()).toHaveLength(1);
		expect(store.getSnapshot()[0]).toBe(r);
	});

	it('push appends reports in order', () => {
		const store = createPlaygroundStore();
		const r1 = makeReport({ renderNumber: 1 });
		const r2 = makeReport({ renderNumber: 2 });
		store.push(r1);
		store.push(r2);
		const snap = store.getSnapshot();
		expect(snap[0]).toBe(r1);
		expect(snap[1]).toBe(r2);
	});

	it('snapshot is immutable reference — each push returns a new array', () => {
		const store = createPlaygroundStore();
		store.push(makeReport({ renderNumber: 1 }));
		const snap1 = store.getSnapshot();
		store.push(makeReport({ renderNumber: 2 }));
		const snap2 = store.getSnapshot();
		expect(snap1).not.toBe(snap2);
	});

	it('enforces FIFO maxEntries cap (default 50)', () => {
		const store = createPlaygroundStore(3);
		store.push(makeReport({ renderNumber: 1 }));
		store.push(makeReport({ renderNumber: 2 }));
		store.push(makeReport({ renderNumber: 3 }));
		store.push(makeReport({ renderNumber: 4 }));
		const snap = store.getSnapshot();
		expect(snap).toHaveLength(3);
		expect(snap[0].renderNumber).toBe(2);
		expect(snap[2].renderNumber).toBe(4);
	});

	it('clear empties the snapshot', () => {
		const store = createPlaygroundStore();
		store.push(makeReport());
		store.clear();
		expect(store.getSnapshot()).toEqual([]);
	});

	it('subscribe registers listener and returns unsubscribe', () => {
		const store = createPlaygroundStore();
		const listener = vi.fn();
		const unsub = store.subscribe(listener);
		store.push(makeReport());
		expect(listener).toHaveBeenCalledTimes(1);
		unsub();
		store.push(makeReport());
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('notifies all active listeners on push', () => {
		const store = createPlaygroundStore();
		const l1 = vi.fn();
		const l2 = vi.fn();
		store.subscribe(l1);
		store.subscribe(l2);
		store.push(makeReport());
		expect(l1).toHaveBeenCalledTimes(1);
		expect(l2).toHaveBeenCalledTimes(1);
	});

	it('notifies listeners on clear', () => {
		const store = createPlaygroundStore();
		const listener = vi.fn();
		store.subscribe(listener);
		store.clear();
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('multiple unsubscribes are safe (no double-delete errors)', () => {
		const store = createPlaygroundStore();
		const listener = vi.fn();
		const unsub = store.subscribe(listener);
		unsub();
		expect(() => unsub()).not.toThrow();
	});

	it('custom maxEntries is respected', () => {
		const store = createPlaygroundStore(2);
		for (let i = 0; i < 5; i++) store.push(makeReport({ renderNumber: i }));
		expect(store.getSnapshot()).toHaveLength(2);
	});
});
