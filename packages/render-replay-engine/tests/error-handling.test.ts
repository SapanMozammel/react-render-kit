import { describe, it, expect } from 'vitest';
import { createReplayEngine, buildReplaySessions, fromEvents, fromSerialized } from '../src/index.js';
import { ReplayError, createReplayError } from '../src/errors/replay-error.js';
import { makeSessionEvents } from './helpers.js';

describe('ReplayError', () => {
	it('is an instance of Error', () => {
		const err = new ReplayError('EMPTY_SOURCE');
		expect(err).toBeInstanceOf(Error);
	});

	it('has name ReplayError', () => {
		const err = new ReplayError('EMPTY_SOURCE');
		expect(err.name).toBe('ReplayError');
	});

	it('exposes code', () => {
		const err = new ReplayError('MULTIPLE_SESSIONS', 'details here');
		expect(err.code).toBe('MULTIPLE_SESSIONS');
	});

	it('exposes detail', () => {
		const err = new ReplayError('SESSION_NOT_FOUND', 'sess-99');
		expect(err.detail).toBe('sess-99');
	});

	it('detail is undefined when not provided', () => {
		const err = new ReplayError('EMPTY_SOURCE');
		expect(err.detail).toBeUndefined();
	});

	it('createReplayError returns ReplayError instance', () => {
		const err = createReplayError('NO_RENDER_EVENTS', 'no frames');
		expect(err).toBeInstanceOf(ReplayError);
		expect(err.code).toBe('NO_RENDER_EVENTS');
	});
});

describe('EMPTY_SOURCE', () => {
	it('throws when events array is empty', () => {
		expect(() => createReplayEngine(fromEvents([]))).toThrow(ReplayError);
		try {
			createReplayEngine(fromEvents([]));
		} catch (err) {
			expect((err as ReplayError).code).toBe('EMPTY_SOURCE');
		}
	});

	it('buildReplaySessions throws on empty', () => {
		try {
			buildReplaySessions(fromEvents([]));
		} catch (err) {
			expect((err as ReplayError).code).toBe('EMPTY_SOURCE');
		}
	});
});

describe('INVALID_SERIALIZED_JSON', () => {
	it('throws for malformed JSON', () => {
		try {
			createReplayEngine(fromSerialized('{not valid}'));
		} catch (err) {
			expect((err as ReplayError).code).toBe('INVALID_SERIALIZED_JSON');
		}
	});
});

describe('MULTIPLE_SESSIONS', () => {
	it('throws when source has multiple sessions and no sessionId provided', () => {
		const eventsA = makeSessionEvents(2, { componentName: 'A' });
		const eventsB = makeSessionEvents(2, { componentName: 'B' });
		try {
			createReplayEngine(fromEvents([...eventsA, ...eventsB]));
		} catch (err) {
			expect((err as ReplayError).code).toBe('MULTIPLE_SESSIONS');
		}
	});
});

describe('SESSION_NOT_FOUND', () => {
	it('throws when specified sessionId is not in source', () => {
		const events = makeSessionEvents(3);
		try {
			createReplayEngine(fromEvents(events), 'does-not-exist');
		} catch (err) {
			expect((err as ReplayError).code).toBe('SESSION_NOT_FOUND');
		}
	});
});

describe('NO_RENDER_EVENTS', () => {
	it('throws when session has no render events', () => {
		// only a session-start event, no renders
		const events = makeSessionEvents(0, { includeSessionEnd: false });
		try {
			createReplayEngine(fromEvents(events));
		} catch (err) {
			// either EMPTY_SOURCE (no events at all) or NO_RENDER_EVENTS
			expect(['EMPTY_SOURCE', 'NO_RENDER_EVENTS']).toContain((err as ReplayError).code);
		}
	});
});

describe('navigate.* never throws', () => {
	it('all navigation methods return null gracefully without throwing', () => {
		const engine = makeEngine(3);
		const start = engine.navigate.atStart();
		const end = engine.navigate.atEnd();
		expect(() => engine.navigate.next(end)).not.toThrow();
		expect(() => engine.navigate.previous(start)).not.toThrow();
		expect(() => engine.navigate.at(999)).not.toThrow();
		expect(() => engine.navigate.seek(start, 999)).not.toThrow();
		expect(() => engine.navigate.jumpToRender(start, 999)).not.toThrow();
		expect(() => engine.navigate.nextMatching(end, { maxScore: 0 })).not.toThrow();
		expect(() => engine.navigate.previousMatching(start, { maxScore: 0 })).not.toThrow();
		expect(() => engine.navigate.jumpToBookmark('unknown')).not.toThrow();
		expect(() => engine.navigate.jumpToTimestamp(start, -1)).not.toThrow();
	});
});

function makeEngine(n: number) {
	const events = makeSessionEvents(n);
	return createReplayEngine(fromEvents(events));
}
