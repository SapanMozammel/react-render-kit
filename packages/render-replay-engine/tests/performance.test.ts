import { describe, it, expect } from 'vitest';
import { createReplayEngine, fromEvents, applyFilter } from '../src/index.js';
import { makeSessionEvents } from './helpers.js';

describe('performance — session build time', () => {
	it('builds session from 10,000 events in < 100ms', () => {
		const events = makeSessionEvents(2000, { includeProps: true, includeScore: true, includeFrequency: true });
		const start = performance.now();
		createReplayEngine(fromEvents(events));
		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(100);
	});

	it('builds session from 1,000 events in < 10ms', () => {
		const events = makeSessionEvents(200, { includeProps: true, includeScore: true });
		const start = performance.now();
		createReplayEngine(fromEvents(events));
		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(10);
	});
});

describe('performance — filter time', () => {
	it('applyFilter on 5,000 frames in < 50ms', () => {
		const events = makeSessionEvents(5000, { includeScore: true, includeProps: false, includeFrequency: false });
		const engine = createReplayEngine(fromEvents(events), undefined, { maxFrames: 0 });
		const start = performance.now();
		applyFilter(engine.session, { maxScore: 50 });
		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(50);
	});
});

describe('performance — navigation O(1)', () => {
	it('1,000 sequential next() calls complete in < 5ms', () => {
		const events = makeSessionEvents(2000, { includeScore: false, includeProps: false, includeFrequency: false });
		const engine = createReplayEngine(fromEvents(events), undefined, { maxFrames: 0 });
		let cursor = engine.navigate.atStart();
		const start = performance.now();
		for (let i = 0; i < 1000; i++) {
			const next = engine.navigate.next(cursor);
			if (next) cursor = next;
		}
		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(5);
	});

	it('jumpToRender is O(1) — 1,000 random jumps in < 5ms', () => {
		const events = makeSessionEvents(2000, { includeScore: false, includeProps: false, includeFrequency: false });
		const engine = createReplayEngine(fromEvents(events), undefined, { maxFrames: 0 });
		const cursor = engine.navigate.atStart();
		const start = performance.now();
		for (let i = 1; i <= 1000; i++) {
			engine.navigate.jumpToRender(cursor, (i % 2000) + 1);
		}
		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(5);
	});
});
