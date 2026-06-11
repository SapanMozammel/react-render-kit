import { describe, it, expect } from 'vitest';
import { buildFrames } from '../src/builder/frame-builder.js';
import { makeSessionEvents, makeRenderEvent, makePropChangeEvent, makeScoreEvent } from './helpers.js';
import { createTelemetrySession } from '@sapanmozammel/render-telemetry-core';

const SESSION_ID = 'test-session-1';
const BASE_TS = 1_700_000_000_000;

describe('buildFrames', () => {
	it('returns empty array for empty events', () => {
		const frames = buildFrames([], BASE_TS, SESSION_ID);
		expect(frames).toHaveLength(0);
	});

	it('creates one frame per render event', () => {
		const events = makeSessionEvents(5);
		const renderEvents = events.filter((e) => e.type === 'render');
		const sessionId = renderEvents[0]!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames).toHaveLength(5);
	});

	it('assigns frameIndex 0-based incrementally', () => {
		const events = makeSessionEvents(3);
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.frameIndex).toBe(0);
		expect(frames[1]!.frameIndex).toBe(1);
		expect(frames[2]!.frameIndex).toBe(2);
	});

	it('assigns renderNumber from render event', () => {
		const events = makeSessionEvents(3);
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.renderNumber).toBe(1);
		expect(frames[2]!.renderNumber).toBe(3);
	});

	it('computes frame id as sessionId:frameIndex', () => {
		const events = makeSessionEvents(2);
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.id).toBe(`${sessionId}:0`);
		expect(frames[1]!.id).toBe(`${sessionId}:1`);
	});

	it('computes relativeMs as wallTimestamp - startedAt', () => {
		const events = makeSessionEvents(2);
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const renderEvent = events.find((e) => e.type === 'render')!;
		const frames = buildFrames(events, renderEvent.wallTimestamp, sessionId);
		expect(frames[0]!.relativeMs).toBe(0);
	});

	it('merges propChangeEvent by renderNumber', () => {
		const events = makeSessionEvents(3, { includeProps: true });
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.propChangeEvent).not.toBeNull();
		expect(frames[0]!.propChangeEvent?.type).toBe('prop-change');
	});

	it('merges frequencyEvent by renderNumber', () => {
		const events = makeSessionEvents(2, { includeFrequency: true });
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.frequencyEvent).not.toBeNull();
	});

	it('merges scoreEvent by renderNumber', () => {
		const events = makeSessionEvents(2, { includeScore: true, scoreValue: 75 });
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.scoreEvent).not.toBeNull();
		expect(frames[0]!.score).toBe(75);
	});

	it('merges recommendationEvent by renderNumber', () => {
		const events = makeSessionEvents(2, { includeRecommendations: true });
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.recommendationEvent).not.toBeNull();
		expect(frames[0]!.recommendationCount).toBe(1);
	});

	it('sets nulls for missing optional events', () => {
		const events = makeSessionEvents(2, { includeProps: false, includeFrequency: false, includeScore: false });
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.propChangeEvent).toBeNull();
		expect(frames[0]!.frequencyEvent).toBeNull();
		expect(frames[0]!.scoreEvent).toBeNull();
		expect(frames[0]!.score).toBeNull();
		expect(frames[0]!.grade).toBeNull();
	});

	it('handles out-of-order events (sorted by insertion order of render events)', () => {
		const events = makeSessionEvents(3);
		const shuffled = [...events].sort(() => Math.random() - 0.5);
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(shuffled, BASE_TS, sessionId);
		// should still produce 3 frames
		expect(frames).toHaveLength(3);
		// frames sorted by frameIndex (= insertion order of render events into frameMap)
		for (let i = 0; i < frames.length - 1; i++) {
			expect(frames[i]!.frameIndex).toBeLessThan(frames[i + 1]!.frameIndex);
		}
	});

	it('ignores duplicate render events for same renderNumber (first wins)', () => {
		const session = createTelemetrySession('Test');
		const r1 = makeRenderEvent(session, 1);
		const r1b = makeRenderEvent(r1.session, 1); // same renderNumber
		const frames = buildFrames([r1.event, r1b.event], BASE_TS, SESSION_ID);
		expect(frames).toHaveLength(1);
	});

	it('ignores duplicate propChange events for same renderNumber (first wins)', () => {
		const events = makeSessionEvents(1, { includeProps: false });
		const s0 = createTelemetrySession('Test');
		const r1 = makeRenderEvent(s0, 1);
		const p1 = makePropChangeEvent(r1.session, 1);
		const p1b = makePropChangeEvent(p1.session, 1);
		const allEvents = [r1.event, p1.event, p1b.event];
		const frames = buildFrames(allEvents, BASE_TS, SESSION_ID);
		expect(frames).toHaveLength(1);
		expect(frames[0]!.propChangeEvent?.id).toBe(p1.event.id);
	});

	it('computes hasUnstableProps from propChange.unstable.length', () => {
		const events = makeSessionEvents(1, { includeProps: true });
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.hasUnstableProps).toBe(false); // default helpers have empty unstable
	});

	it('maps triggeredBy parent to parent', () => {
		const events = makeSessionEvents(1, { triggeredBy: 'parent' });
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.triggeredBy).toBe('parent');
	});

	it('maps triggeredBy props to props', () => {
		const events = makeSessionEvents(1, { triggeredBy: 'props' });
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.triggeredBy).toBe('props');
	});

	it('maps triggeredBy unknown to parent', () => {
		const events = makeSessionEvents(1, { triggeredBy: 'unknown' });
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.triggeredBy).toBe('parent');
	});

	it('computes grade from scoreEvent', () => {
		const s0 = createTelemetrySession('Test');
		const r1 = makeRenderEvent(s0, 1);
		const sc1 = makeScoreEvent(r1.session, 1, 95);
		const frames = buildFrames([r1.event, sc1.event], BASE_TS, SESSION_ID);
		expect(frames[0]!.grade).toBe('EXCELLENT');
	});

	it('returns frozen frames array', () => {
		const events = makeSessionEvents(2);
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(Object.isFrozen(frames)).toBe(true);
		expect(Object.isFrozen(frames[0])).toBe(true);
	});

	it('sets componentName from render event', () => {
		const events = makeSessionEvents(1, { componentName: 'MyCard' });
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const frames = buildFrames(events, BASE_TS, sessionId);
		expect(frames[0]!.componentName).toBe('MyCard');
	});
});
