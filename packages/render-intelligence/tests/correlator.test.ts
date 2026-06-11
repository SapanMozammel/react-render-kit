import { describe, it, expect, beforeEach } from 'vitest';
import { detectCorrelations } from '../src/correlator/correlation-engine.js';
import { resetSeq, makeSessionData, makeRenderEvent } from './helpers.js';

beforeEach(() => resetSeq());

const makeTimestampedRenders = (componentName: string, sessionId: string, timestamps: number[]) =>
	makeSessionData({
		componentName,
		sessionId,
		events: timestamps.map((ts) => makeRenderEvent({ componentName, sessionId, wallTimestamp: ts })),
	});

describe('detectCorrelations', () => {
	it('returns empty for fewer than 2 components', () => {
		const data = [makeTimestampedRenders('A', 's1', [100, 200, 300, 400, 500])];
		expect(detectCorrelations(data, 50)).toHaveLength(0);
	});

	it('returns empty when components have fewer than 5 renders', () => {
		const data = [makeTimestampedRenders('A', 's1', [100, 200, 300, 400]), makeTimestampedRenders('B', 's1', [110, 210, 310, 410])];
		expect(detectCorrelations(data, 50)).toHaveLength(0);
	});

	it('returns empty when fewer than 5 proximate pairs', () => {
		const tsA = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
		const tsB = [150, 250, 9000, 9100, 9200, 9300, 9400, 9500, 9600, 9700];
		const data = [makeTimestampedRenders('A', 's1', tsA), makeTimestampedRenders('B', 's1', tsB)];
		expect(detectCorrelations(data, 30)).toHaveLength(0);
	});

	it('detects probable-cascade when A consistently renders before B', () => {
		// A always renders 5ms before B — strong cascade signal
		const base = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
		const tsA = base;
		const tsB = base.map((t) => t + 5);
		const data = [makeTimestampedRenders('A', 's1', tsA), makeTimestampedRenders('B', 's1', tsB)];
		const result = detectCorrelations(data, 50);
		expect(result.length).toBeGreaterThan(0);
		const cascade = result.find((g) => g.type === 'probable-cascade');
		expect(cascade).toBeDefined();
		expect(cascade!.components[0]).toBe('A');
		expect(cascade!.components[1]).toBe('B');
	});

	it('detects probable-cascade in reverse when B always renders before A', () => {
		const base = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
		const tsB = base;
		const tsA = base.map((t) => t + 5);
		const data = [makeTimestampedRenders('A', 's1', tsA), makeTimestampedRenders('B', 's1', tsB)];
		const result = detectCorrelations(data, 50);
		const cascade = result.find((g) => g.type === 'probable-cascade');
		expect(cascade).toBeDefined();
		expect(cascade!.components[0]).toBe('B');
	});

	it('detects synchronized-renders when renders are proximate but no clear order', () => {
		// Interleaved timestamps — no consistent ordering
		const tsA = [100, 210, 300, 410, 500, 610, 700, 810, 900, 1010];
		const tsB = [105, 205, 305, 405, 505, 605, 705, 805, 905, 1005];
		const data = [makeTimestampedRenders('A', 's1', tsA), makeTimestampedRenders('B', 's1', tsB)];
		const result = detectCorrelations(data, 50);
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]!.components).toContain('A');
		expect(result[0]!.components).toContain('B');
	});

	it('includes all component names from data as candidates', () => {
		const ts = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
		const data = [
			makeTimestampedRenders('A', 's1', ts),
			makeTimestampedRenders(
				'B',
				's1',
				ts.map((t) => t + 3)
			),
			makeTimestampedRenders(
				'C',
				's1',
				ts.map((t) => t + 6)
			),
		];
		const result = detectCorrelations(data, 50);
		expect(result.length).toBeGreaterThanOrEqual(1);
	});

	it('returns frozen array', () => {
		const data = [makeTimestampedRenders('A', 's1', [100, 200, 300, 400, 500]), makeTimestampedRenders('B', 's1', [110, 210, 310, 410, 510])];
		const result = detectCorrelations(data, 50);
		expect(Object.isFrozen(result)).toBe(true);
	});
});
