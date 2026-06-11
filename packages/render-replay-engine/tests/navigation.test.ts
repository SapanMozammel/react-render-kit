import { describe, it, expect } from 'vitest';
import { makeEngine } from './helpers.js';

describe('navigate.atStart / atEnd', () => {
	it('atStart returns cursor at frameIndex 0', () => {
		const engine = makeEngine(5);
		const cursor = engine.navigate.atStart();
		expect(cursor.frameIndex).toBe(0);
		expect(cursor.isAtStart).toBe(true);
		expect(cursor.canGoPrevious).toBe(false);
	});

	it('atEnd returns cursor at last frameIndex', () => {
		const engine = makeEngine(5);
		const cursor = engine.navigate.atEnd();
		expect(cursor.frameIndex).toBe(4);
		expect(cursor.isAtEnd).toBe(true);
		expect(cursor.canGoNext).toBe(false);
	});
});

describe('navigate.at', () => {
	it('returns cursor at exact index', () => {
		const engine = makeEngine(5);
		const cursor = engine.navigate.at(2);
		expect(cursor?.frameIndex).toBe(2);
	});

	it('returns null for negative index', () => {
		const engine = makeEngine(5);
		expect(engine.navigate.at(-1)).toBeNull();
	});

	it('returns null for index >= frameCount', () => {
		const engine = makeEngine(5);
		expect(engine.navigate.at(5)).toBeNull();
	});
});

describe('navigate.next / previous', () => {
	it('next advances by 1', () => {
		const engine = makeEngine(5);
		const start = engine.navigate.atStart();
		const next = engine.navigate.next(start);
		expect(next?.frameIndex).toBe(1);
	});

	it('next at end returns null', () => {
		const engine = makeEngine(5);
		const end = engine.navigate.atEnd();
		expect(engine.navigate.next(end)).toBeNull();
	});

	it('previous goes back by 1', () => {
		const engine = makeEngine(5);
		const end = engine.navigate.atEnd();
		const prev = engine.navigate.previous(end);
		expect(prev?.frameIndex).toBe(3);
	});

	it('previous at start returns null', () => {
		const engine = makeEngine(5);
		const start = engine.navigate.atStart();
		expect(engine.navigate.previous(start)).toBeNull();
	});
});

describe('navigate.seek', () => {
	it('seeks to arbitrary index', () => {
		const engine = makeEngine(10);
		const cursor = engine.navigate.atStart();
		const seeked = engine.navigate.seek(cursor, 7);
		expect(seeked?.frameIndex).toBe(7);
	});

	it('returns null for out-of-range', () => {
		const engine = makeEngine(5);
		const cursor = engine.navigate.atStart();
		expect(engine.navigate.seek(cursor, 10)).toBeNull();
	});
});

describe('navigate.jumpToRender', () => {
	it('jumps to frame with matching renderNumber', () => {
		const engine = makeEngine(10);
		const cursor = engine.navigate.atStart();
		const jumped = engine.navigate.jumpToRender(cursor, 5);
		expect(jumped?.frame.renderNumber).toBe(5);
	});

	it('returns null for non-existent renderNumber', () => {
		const engine = makeEngine(5);
		const cursor = engine.navigate.atStart();
		expect(engine.navigate.jumpToRender(cursor, 999)).toBeNull();
	});
});

describe('navigate.jumpToTimestamp', () => {
	it('returns cursor at nearest frame (never null)', () => {
		const engine = makeEngine(5);
		const cursor = engine.navigate.atStart();
		const result = engine.navigate.jumpToTimestamp(cursor, 0);
		expect(result).not.toBeNull();
		expect(result.frameIndex).toBeGreaterThanOrEqual(0);
	});

	it('returns start frame for relativeMs 0', () => {
		const engine = makeEngine(5);
		const cursor = engine.navigate.atStart();
		const result = engine.navigate.jumpToTimestamp(cursor, 0);
		expect(result.frameIndex).toBe(0);
	});

	it('returns last frame for very large relativeMs', () => {
		const engine = makeEngine(5);
		const cursor = engine.navigate.atStart();
		const result = engine.navigate.jumpToTimestamp(cursor, Number.MAX_SAFE_INTEGER);
		expect(result.frameIndex).toBe(engine.session.frameCount - 1);
	});
});

describe('navigate.nextMatching / previousMatching', () => {
	it('nextMatching finds next frame matching filter', () => {
		const engine = makeEngine(10, {
			scoreOverrides: { 1: 90, 2: 90, 3: 30, 4: 90, 5: 90, 6: 90, 7: 90, 8: 90, 9: 90, 10: 90 },
		});
		const start = engine.navigate.atStart();
		const found = engine.navigate.nextMatching(start, { maxScore: 50 });
		expect(found?.frame.score).toBeLessThanOrEqual(50);
	});

	it('nextMatching returns null if no match after cursor', () => {
		const engine = makeEngine(5, { scoreValue: 90 });
		const start = engine.navigate.atStart();
		expect(engine.navigate.nextMatching(start, { maxScore: 20 })).toBeNull();
	});

	it('previousMatching finds previous frame matching filter', () => {
		const engine = makeEngine(10, {
			scoreOverrides: { 1: 90, 2: 30, 3: 90, 4: 90, 5: 90, 6: 90, 7: 90, 8: 90, 9: 90, 10: 90 },
		});
		const end = engine.navigate.atEnd();
		const found = engine.navigate.previousMatching(end, { maxScore: 50 });
		expect(found?.frame.score).toBeLessThanOrEqual(50);
	});

	it('previousMatching returns null if no match before cursor', () => {
		const engine = makeEngine(5, { scoreValue: 90 });
		const end = engine.navigate.atEnd();
		expect(engine.navigate.previousMatching(end, { maxScore: 20 })).toBeNull();
	});
});

describe('cursor fields', () => {
	it('middle cursor has correct boolean flags', () => {
		const engine = makeEngine(5);
		const cursor = engine.navigate.at(2)!;
		expect(cursor.isAtStart).toBe(false);
		expect(cursor.isAtEnd).toBe(false);
		expect(cursor.canGoPrevious).toBe(true);
		expect(cursor.canGoNext).toBe(true);
	});

	it('cursor.frame is the full ReplayFrame', () => {
		const engine = makeEngine(3);
		const cursor = engine.navigate.at(1)!;
		expect(cursor.frame.frameIndex).toBe(1);
		expect(cursor.frame.renderNumber).toBe(2);
	});

	it('cursor.totalFrames matches session.frameCount', () => {
		const engine = makeEngine(7);
		const cursor = engine.navigate.atStart();
		expect(cursor.totalFrames).toBe(7);
	});
});

describe('navigate — does not throw', () => {
	it('all navigate methods return null not throw for out-of-bounds', () => {
		const engine = makeEngine(3);
		const start = engine.navigate.atStart();
		const end = engine.navigate.atEnd();
		expect(() => engine.navigate.next(end)).not.toThrow();
		expect(engine.navigate.next(end)).toBeNull();
		expect(() => engine.navigate.previous(start)).not.toThrow();
		expect(engine.navigate.previous(start)).toBeNull();
		expect(() => engine.navigate.at(999)).not.toThrow();
		expect(engine.navigate.at(999)).toBeNull();
		expect(() => engine.navigate.jumpToRender(start, 999)).not.toThrow();
		expect(engine.navigate.jumpToRender(start, 999)).toBeNull();
		expect(() => engine.navigate.nextMatching(end, { maxScore: 0 })).not.toThrow();
	});
});
