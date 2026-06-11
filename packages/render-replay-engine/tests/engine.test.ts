import { describe, it, expect } from 'vitest';
import { makeEngine, makeSessionEvents } from './helpers.js';
import { createReplayEngine, fromEvents, buildReplaySessions } from '../src/index.js';

describe('createReplayEngine — basic', () => {
	it('returns engine with session', () => {
		const engine = makeEngine(5);
		expect(engine.session).toBeDefined();
		expect(engine.session.frameCount).toBe(5);
	});

	it('engine.session is frozen', () => {
		const engine = makeEngine(3);
		expect(Object.isFrozen(engine.session)).toBe(true);
	});

	it('engine.navigate is defined', () => {
		const engine = makeEngine(3);
		expect(engine.navigate).toBeDefined();
		expect(typeof engine.navigate.atStart).toBe('function');
	});

	it('engine.bookmarks is defined', () => {
		const engine = makeEngine(3);
		expect(engine.bookmarks).toBeDefined();
		expect(typeof engine.bookmarks.create).toBe('function');
	});
});

describe('engine.getFrame', () => {
	it('returns frame at index', () => {
		const engine = makeEngine(5);
		const frame = engine.getFrame(2);
		expect(frame?.frameIndex).toBe(2);
	});

	it('returns null for out-of-range index', () => {
		const engine = makeEngine(5);
		expect(engine.getFrame(10)).toBeNull();
		expect(engine.getFrame(-1)).toBeNull();
	});
});

describe('engine.getFrameByRenderNumber', () => {
	it('returns frame with matching renderNumber', () => {
		const engine = makeEngine(5);
		const frame = engine.getFrameByRenderNumber(3);
		expect(frame?.renderNumber).toBe(3);
	});

	it('returns null for non-existent renderNumber', () => {
		const engine = makeEngine(5);
		expect(engine.getFrameByRenderNumber(999)).toBeNull();
	});
});

describe('engine.getFrameRange', () => {
	it('returns frames in range inclusive', () => {
		const engine = makeEngine(10);
		const range = engine.getFrameRange(2, 5);
		expect(range).toHaveLength(4); // indices 2, 3, 4, 5
		expect(range[0]!.frameIndex).toBe(2);
		expect(range[range.length - 1]!.frameIndex).toBe(5);
	});

	it('returns frozen array', () => {
		const engine = makeEngine(5);
		expect(Object.isFrozen(engine.getFrameRange(0, 2))).toBe(true);
	});
});

describe('engine.applyFilter', () => {
	it('delegates to applyFilter and returns result', () => {
		const engine = makeEngine(5, { scoreValue: 90 });
		const result = engine.applyFilter({ maxScore: 50 });
		expect(result.matchingFrameCount).toBe(0);
	});
});

describe('engine.applyPreset', () => {
	it('delegates to applyPreset', () => {
		const engine = makeEngine(5);
		const result = engine.applyPreset('parent-triggered-only');
		expect(result.totalFrameCount).toBe(5);
	});
});

describe('buildReplaySessions — integration', () => {
	it('returns all sessions sorted by startedAt', () => {
		const eventsA = makeSessionEvents(3, { componentName: 'A' });
		const eventsB = makeSessionEvents(3, { componentName: 'B' });
		const sessions = buildReplaySessions(fromEvents([...eventsA, ...eventsB]));
		expect(sessions).toHaveLength(2);
		expect(sessions[0]!.startedAt).toBeLessThanOrEqual(sessions[1]!.startedAt);
	});

	it('each session has correct frameCount', () => {
		const eventsA = makeSessionEvents(4, { componentName: 'A' });
		const eventsB = makeSessionEvents(6, { componentName: 'B' });
		const sessions = buildReplaySessions(fromEvents([...eventsA, ...eventsB]));
		const counts = sessions.map((s) => s.frameCount).sort((a, b) => a - b);
		expect(counts).toEqual([4, 6]);
	});

	it('accepts options', () => {
		const events = makeSessionEvents(20);
		const sessions = buildReplaySessions(fromEvents(events), { maxFrames: 10 });
		expect(sessions[0]!.frameCount).toBe(10);
	});
});

describe('full pipeline — end to end', () => {
	it('can navigate through a full session', () => {
		const engine = makeEngine(10);
		let cursor = engine.navigate.atStart();
		let count = 0;
		while (!cursor.isAtEnd) {
			cursor = engine.navigate.next(cursor)!;
			count++;
		}
		expect(count).toBe(9);
		expect(cursor.frameIndex).toBe(9);
	});

	it('filter → navigate to first match', () => {
		const engine = makeEngine(10, { scoreOverrides: { 5: 30, 6: 30 } });
		const start = engine.navigate.atStart();
		const firstIssue = engine.navigate.nextMatching(start, { maxScore: 50 });
		expect(firstIssue).not.toBeNull();
		expect(firstIssue!.frame.score).toBeLessThanOrEqual(50);
	});
});
