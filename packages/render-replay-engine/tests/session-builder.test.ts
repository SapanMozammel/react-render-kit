import { describe, it, expect } from 'vitest';
import { buildSessions } from '../src/builder/session-builder.js';
import { makeSessionEvents } from './helpers.js';

describe('buildSessions — basic', () => {
	it('builds one session from single-session events', () => {
		const events = makeSessionEvents(5);
		const sessions = buildSessions(events, {});
		expect(sessions).toHaveLength(1);
	});

	it('session has correct frameCount', () => {
		const events = makeSessionEvents(5);
		const [session] = buildSessions(events, {});
		expect(session!.frameCount).toBe(5);
		expect(session!.frames).toHaveLength(5);
	});

	it('session id matches event sessionId', () => {
		const events = makeSessionEvents(3);
		const sessionId = events.find((e) => e.type === 'render')!.sessionId;
		const [session] = buildSessions(events, {});
		expect(session!.id).toBe(sessionId);
	});

	it('session componentName from first event', () => {
		const events = makeSessionEvents(3, { componentName: 'Banner' });
		const [session] = buildSessions(events, {});
		expect(session!.componentName).toBe('Banner');
	});

	it('session startedAt from session-start event wallTimestamp', () => {
		const events = makeSessionEvents(3);
		const startEvent = events.find((e) => e.type === 'session-start')!;
		const [session] = buildSessions(events, {});
		expect(session!.startedAt).toBe(startEvent.wallTimestamp);
	});

	it('session endedAt from session-end event', () => {
		const events = makeSessionEvents(3, { includeSessionEnd: true });
		const endEvent = events.find((e) => e.type === 'session-end')!;
		const [session] = buildSessions(events, {});
		expect(session!.endedAt).toBe(endEvent.wallTimestamp);
	});

	it('session endedAt is null when no session-end event', () => {
		const events = makeSessionEvents(3, { includeSessionEnd: false });
		const [session] = buildSessions(events, {});
		expect(session!.endedAt).toBeNull();
	});

	it('returns sessions sorted by startedAt ascending', () => {
		const eventsA = makeSessionEvents(2, { componentName: 'A' });
		const eventsB = makeSessionEvents(2, { componentName: 'B' });
		const combined = [...eventsA, ...eventsB];
		const sessions = buildSessions(combined, {});
		expect(sessions).toHaveLength(2);
		expect(sessions[0]!.startedAt).toBeLessThanOrEqual(sessions[1]!.startedAt);
	});

	it('frozen session and frames', () => {
		const events = makeSessionEvents(3);
		const [session] = buildSessions(events, {});
		expect(Object.isFrozen(session)).toBe(true);
	});

	it('pruningInfo.pruned false when under maxFrames', () => {
		const events = makeSessionEvents(5);
		const [session] = buildSessions(events, { maxFrames: 100 });
		expect(session!.pruningInfo.pruned).toBe(false);
	});

	it('prunes via fifo — drops oldest frames', () => {
		const events = makeSessionEvents(10);
		const [session] = buildSessions(events, { maxFrames: 5, pruningStrategy: 'fifo' });
		expect(session!.frameCount).toBe(5);
		expect(session!.frames[0]!.renderNumber).toBe(6); // oldest 5 dropped
		expect(session!.pruningInfo.pruned).toBe(true);
		if (session!.pruningInfo.pruned) {
			expect(session!.pruningInfo.originalFrameCount).toBe(10);
			expect(session!.pruningInfo.prunedFrameCount).toBe(5);
			expect(session!.pruningInfo.strategy).toBe('fifo');
		}
	});

	it('prunes via score-weighted — drops highest-scoring frames', () => {
		const events = makeSessionEvents(6, {
			scoreOverrides: { 1: 100, 2: 90, 3: 80, 4: 40, 5: 30, 6: 20 },
		});
		const [session] = buildSessions(events, { maxFrames: 3, pruningStrategy: 'score-weighted' });
		expect(session!.frameCount).toBe(3);
		// keeps worst (scores 40, 30, 20 = renders 4, 5, 6)
		const scores = session!.frames.map((f) => f.score);
		expect(Math.max(...(scores.filter((s): s is number => s !== null)))).toBeLessThanOrEqual(40);
	});

	it('stats.totalRenders reflects original pre-prune count', () => {
		const events = makeSessionEvents(10);
		const [session] = buildSessions(events, { maxFrames: 5 });
		// stats computed before pruning
		expect(session!.stats.totalRenders).toBe(10);
	});

	it('timeline.entries length reflects original pre-prune count', () => {
		const events = makeSessionEvents(10);
		const [session] = buildSessions(events, { maxFrames: 5 });
		expect(session!.timeline.entries).toHaveLength(10);
	});

	it('enables/disables stats via options', () => {
		const events = makeSessionEvents(5);
		const [session] = buildSessions(events, { enableStats: false });
		expect(session!.stats.totalRenders).toBe(0);
	});

	it('disables timeline via options', () => {
		const events = makeSessionEvents(5);
		const [session] = buildSessions(events, { enableTimeline: false });
		expect(session!.timeline.entries).toHaveLength(0);
		expect(session!.timeline.segments).toHaveLength(0);
	});
});

describe('buildSessions — stats accuracy', () => {
	it('computes averageScore', () => {
		const events = makeSessionEvents(4, { scoreOverrides: { 1: 80, 2: 60, 3: 40, 4: 20 } });
		const [session] = buildSessions(events, {});
		expect(session!.stats.averageScore).toBe(50);
	});

	it('computes minScore and maxScore', () => {
		const events = makeSessionEvents(3, { scoreOverrides: { 1: 100, 2: 50, 3: 10 } });
		const [session] = buildSessions(events, {});
		expect(session!.stats.minScore).toBe(10);
		expect(session!.stats.maxScore).toBe(100);
	});

	it('computes scoreDelta as finalScore - initialScore', () => {
		const events = makeSessionEvents(3, { scoreOverrides: { 1: 90, 2: 70, 3: 50 } });
		const [session] = buildSessions(events, {});
		expect(session!.stats.scoreDelta).toBe(-40);
	});

	it('stats null when no score events', () => {
		const events = makeSessionEvents(3, { includeScore: false });
		const [session] = buildSessions(events, {});
		expect(session!.stats.averageScore).toBeNull();
		expect(session!.stats.minScore).toBeNull();
		expect(session!.stats.maxScore).toBeNull();
	});
});

describe('buildSessions — timeline segments', () => {
	it('builds at least one segment for sessions with scores', () => {
		const events = makeSessionEvents(5, { includeScore: true });
		const [session] = buildSessions(events, {});
		expect(session!.timeline.segments.length).toBeGreaterThan(0);
	});

	it('disables segments via enableSegments: false', () => {
		const events = makeSessionEvents(5);
		const [session] = buildSessions(events, { enableSegments: false });
		expect(session!.timeline.segments).toHaveLength(0);
	});
});
