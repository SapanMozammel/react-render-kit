import { describe, it, expect, beforeEach } from 'vitest';
import { partitionSessions } from '../src/partitioner/session-partitioner.js';
import { resetSeq, makeSessionData, makeRenderEvent, makeScoreEvent } from './helpers.js';

beforeEach(() => resetSeq());

describe('partitionSessions', () => {
	it('returns empty array for empty input', () => {
		expect(partitionSessions([])).toHaveLength(0);
	});

	it('passes through a single session unchanged', () => {
		const data = [makeSessionData({ componentName: 'A', sessionId: 's1' })];
		const result = partitionSessions(data);
		expect(result).toHaveLength(1);
		expect(result[0]!.componentName).toBe('A');
	});

	it('passes through multiple distinct sessions unchanged', () => {
		const data = [makeSessionData({ componentName: 'A', sessionId: 's1' }), makeSessionData({ componentName: 'B', sessionId: 's1' }), makeSessionData({ componentName: 'A', sessionId: 's2' })];
		const result = partitionSessions(data);
		expect(result).toHaveLength(3);
	});

	it('merges duplicate (componentName, sessionId) pairs by concatenating events in order', () => {
		const e1 = makeRenderEvent({ sessionId: 's1', componentName: 'A' });
		const e2 = makeScoreEvent({ sessionId: 's1', componentName: 'A' });
		const data = [makeSessionData({ componentName: 'A', sessionId: 's1', events: [e2] }), makeSessionData({ componentName: 'A', sessionId: 's1', events: [e1] })];
		const result = partitionSessions(data);
		expect(result).toHaveLength(1);
		expect(result[0]!.events).toHaveLength(2);
		expect(result[0]!.events[0]!.sequenceNumber).toBeLessThan(result[0]!.events[1]!.sequenceNumber);
	});

	it('keeps non-duplicate sessions separate after merge', () => {
		const data = [
			makeSessionData({ componentName: 'A', sessionId: 's1', events: [makeRenderEvent()] }),
			makeSessionData({ componentName: 'A', sessionId: 's1', events: [makeScoreEvent()] }),
			makeSessionData({ componentName: 'B', sessionId: 's1', events: [makeRenderEvent()] }),
		];
		const result = partitionSessions(data);
		expect(result).toHaveLength(2);
		const aSession = result.find((r) => r.componentName === 'A');
		expect(aSession!.events).toHaveLength(2);
	});

	it('uses frames from first session when second has null frames', () => {
		const data = [makeSessionData({ componentName: 'A', sessionId: 's1' }), makeSessionData({ componentName: 'A', sessionId: 's1' })];
		const result = partitionSessions(data);
		expect(result[0]!.frames).toBeNull();
	});
});
