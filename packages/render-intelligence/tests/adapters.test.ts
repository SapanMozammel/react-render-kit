import { describe, it, expect, beforeEach } from 'vitest';
import { fromEvents } from '../src/adapters/from-events.js';
import { fromSnapshot } from '../src/adapters/from-snapshot.js';
import { fromReplay } from '../src/adapters/from-replay.js';
import { resetSeq, makeRenderEvent, makeScoreEvent } from './helpers.js';
import type { TelemetrySnapshot } from '@sapanmozammel/render-core-schema';

beforeEach(() => resetSeq());

describe('fromEvents', () => {
	it('returns empty array for empty events', () => {
		expect(fromEvents([])).toHaveLength(0);
	});

	it('groups events from a single session into one ComponentSessionData', () => {
		const events = [makeRenderEvent({ sessionId: 's1', componentName: 'A' }), makeScoreEvent({ sessionId: 's1', componentName: 'A' })];
		const result = fromEvents(events);
		expect(result).toHaveLength(1);
		expect(result[0]!.componentName).toBe('A');
		expect(result[0]!.sessionId).toBe('s1');
		expect(result[0]!.events).toHaveLength(2);
	});

	it('creates separate sessions for different (sessionId, componentName) pairs', () => {
		const events = [makeRenderEvent({ sessionId: 's1', componentName: 'A' }), makeRenderEvent({ sessionId: 's1', componentName: 'B' }), makeRenderEvent({ sessionId: 's2', componentName: 'A' })];
		const result = fromEvents(events);
		expect(result).toHaveLength(3);
		const names = result.map((r) => `${r.sessionId}::${r.componentName}`);
		expect(names).toContain('s1::A');
		expect(names).toContain('s1::B');
		expect(names).toContain('s2::A');
	});

	it('preserves event order by sequenceNumber within each session', () => {
		const e1 = makeRenderEvent({ sessionId: 's1', componentName: 'A' });
		const e2 = makeScoreEvent({ sessionId: 's1', componentName: 'A' });
		const result = fromEvents([e2, e1]);
		expect(result[0]!.events[0]!.sequenceNumber).toBeLessThan(result[0]!.events[1]!.sequenceNumber);
	});

	it('sets frames to null', () => {
		const result = fromEvents([makeRenderEvent()]);
		expect(result[0]!.frames).toBeNull();
	});
});

describe('fromSnapshot', () => {
	it('delegates to fromEvents using snapshot.events', () => {
		const events = [makeRenderEvent({ componentName: 'X' })];
		const snapshot: TelemetrySnapshot = { events, sessions: {} };
		const result = fromSnapshot(snapshot);
		expect(result).toHaveLength(1);
		expect(result[0]!.componentName).toBe('X');
	});

	it('returns empty array for empty snapshot', () => {
		const snapshot: TelemetrySnapshot = { events: [], sessions: {} };
		expect(fromSnapshot(snapshot)).toHaveLength(0);
	});

	it('handles multi-component snapshot', () => {
		const events = [makeRenderEvent({ sessionId: 's1', componentName: 'A' }), makeRenderEvent({ sessionId: 's1', componentName: 'B' })];
		const snapshot: TelemetrySnapshot = { events, sessions: {} };
		expect(fromSnapshot(snapshot)).toHaveLength(2);
	});
});

describe('fromReplay', () => {
	it('returns empty array for empty sessions', () => {
		expect(fromReplay([])).toHaveLength(0);
	});

	it('collects renderEvent from each frame', () => {
		const renderEvt = makeRenderEvent({ sessionId: 'r1', componentName: 'C' });
		const session = {
			id: 'r1',
			componentName: 'C',
			startedAt: 0,
			endedAt: null,
			durationMs: null,
			schemaVersion: '1.0.0' as const,
			frames: [
				{
					id: 'f0',
					frameIndex: 0,
					renderNumber: 1,
					sessionId: 'r1',
					componentName: 'C',
					wallTimestamp: 100,
					relativeMs: 0,
					renderEvent: renderEvt,
					propChangeEvent: null,
					frequencyEvent: null,
					scoreEvent: null,
					recommendationEvent: null,
					score: null,
					grade: null,
					memoClassification: null,
					frequencyClass: null,
					signalKind: null,
					hasUnstableProps: false,
					unstablePropCount: 0,
					changedPropCount: 0,
					recommendationCount: 0,
					triggeredBy: 'props' as const,
				},
			],
			timeline: { sessionId: 'r1', entries: [], duration: null, segments: [] },
			stats: {
				totalRenders: 1,
				averageScore: null,
				minScore: null,
				maxScore: null,
				initialScore: null,
				finalScore: null,
				scoreDelta: null,
				ineffectiveRenderCount: 0,
				highFrequencyCount: 0,
				unstablePropNames: [],
				totalRecommendations: 0,
				uniqueRecommendations: [],
			},
			frameCount: 1,
			pruningInfo: { pruned: false as const },
		};

		const result = fromReplay([session]);
		expect(result).toHaveLength(1);
		expect(result[0]!.componentName).toBe('C');
		expect(result[0]!.sessionId).toBe('r1');
		expect(result[0]!.frames).not.toBeNull();
		expect(result[0]!.events.some((e) => e.type === 'render')).toBe(true);
	});

	it('handles multiple sessions', () => {
		const makeMinimalSession = (id: string, name: string) => ({
			id,
			componentName: name,
			startedAt: 0,
			endedAt: null,
			durationMs: null,
			schemaVersion: '1.0.0' as const,
			frames: [],
			timeline: { sessionId: id, entries: [], duration: null, segments: [] },
			stats: {
				totalRenders: 0,
				averageScore: null,
				minScore: null,
				maxScore: null,
				initialScore: null,
				finalScore: null,
				scoreDelta: null,
				ineffectiveRenderCount: 0,
				highFrequencyCount: 0,
				unstablePropNames: [],
				totalRecommendations: 0,
				uniqueRecommendations: [],
			},
			frameCount: 0,
			pruningInfo: { pruned: false as const },
		});

		const result = fromReplay([makeMinimalSession('r1', 'A'), makeMinimalSession('r2', 'B')]);
		expect(result).toHaveLength(2);
		expect(result.map((r) => r.componentName)).toEqual(['A', 'B']);
	});
});
