import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeRenders, analyzeComponents, rankBottlenecks } from '../src/pipeline/pipeline.js';
import { IntelligenceError } from '../src/errors/intelligence-error.js';
import { resetSeq, makeRenderEvent, makeScoreEvent } from './helpers.js';
import type { IntelligenceSource } from '../src/types/index.js';

beforeEach(() => resetSeq());

const makeEventsSource = (events = [makeRenderEvent(), makeScoreEvent()]): IntelligenceSource => ({
	type: 'events',
	events,
});

describe('analyzeRenders', () => {
	it('returns a valid IntelligenceReport for a minimal events source', () => {
		const report = analyzeRenders(makeEventsSource());
		expect(report).toHaveProperty('schemaVersion');
		expect(report).toHaveProperty('generatedAt');
		expect(report).toHaveProperty('applicationHealth');
		expect(report).toHaveProperty('components');
		expect(report).toHaveProperty('bottlenecks');
		expect(report).toHaveProperty('rootCauses');
		expect(report).toHaveProperty('correlations');
		expect(report).toHaveProperty('recommendations');
	});

	it('throws EMPTY_SOURCE for events source with no events', () => {
		expect(() => analyzeRenders({ type: 'events', events: [] })).toThrow(IntelligenceError);
		try { analyzeRenders({ type: 'events', events: [] }); } catch (e) {
			expect((e as IntelligenceError).code).toBe('EMPTY_SOURCE');
		}
	});

	it('throws EMPTY_SOURCE for snapshot source with no events', () => {
		expect(() =>
			analyzeRenders({ type: 'snapshot', snapshot: { events: [], sessions: {} } }),
		).toThrow(IntelligenceError);
		try { analyzeRenders({ type: 'snapshot', snapshot: { events: [], sessions: {} } }); } catch (e) {
			expect((e as IntelligenceError).code).toBe('EMPTY_SOURCE');
		}
	});

	it('throws EMPTY_SOURCE for replay source with no sessions', () => {
		expect(() => analyzeRenders({ type: 'replay', sessions: [] })).toThrow(IntelligenceError);
		try { analyzeRenders({ type: 'replay', sessions: [] }); } catch (e) {
			expect((e as IntelligenceError).code).toBe('EMPTY_SOURCE');
		}
	});

	it('sets analysisSource to events for events source', () => {
		const report = analyzeRenders(makeEventsSource());
		expect(report.applicationHealth.analysisSource).toBe('events');
	});

	it('sets analysisSource to snapshot for snapshot source', () => {
		const events = [makeRenderEvent(), makeScoreEvent()];
		const report = analyzeRenders({ type: 'snapshot', snapshot: { events, sessions: {} } });
		expect(report.applicationHealth.analysisSource).toBe('snapshot');
	});

	it('respects maxBottlenecks option', () => {
		const events = [
			makeRenderEvent({ componentName: 'A', sessionId: 's1' }),
			makeRenderEvent({ componentName: 'B', sessionId: 's1' }),
			makeRenderEvent({ componentName: 'C', sessionId: 's1' }),
		];
		const report = analyzeRenders({ type: 'events', events }, { maxBottlenecks: 2 });
		expect(report.bottlenecks.length).toBeLessThanOrEqual(2);
	});

	it('respects maxRecommendations option', () => {
		const events = [makeRenderEvent(), makeScoreEvent()];
		const report = analyzeRenders({ type: 'events', events }, { maxRecommendations: 1 });
		expect(report.recommendations.length).toBeLessThanOrEqual(1);
	});

	it('runs plugins and merges their bottlenecks', () => {
		const events = [makeRenderEvent(), makeScoreEvent()];
		const mockBottleneck = {
			rank: 99,
			componentName: 'Plugin-Component',
			category: 'no-change-renders' as const,
			impactScore: 10,
			description: 'from plugin',
			evidence: Object.freeze([]),
		};
		const report = analyzeRenders(
			{ type: 'events', events },
			{
				plugins: [{
					id: 'test-plugin',
					name: 'Test',
					version: '1.0.0',
					analyze: () => ({ bottlenecks: [mockBottleneck], rootCauses: [], recommendations: [], correlations: [] }),
				}],
			},
		);
		expect(report.bottlenecks.some((b) => b.componentName === 'Plugin-Component')).toBe(true);
	});

	it('generatedAt is a recent timestamp', () => {
		const before = Date.now();
		const report = analyzeRenders(makeEventsSource());
		const after = Date.now();
		expect(report.generatedAt).toBeGreaterThanOrEqual(before);
		expect(report.generatedAt).toBeLessThanOrEqual(after);
	});
});

describe('analyzeComponents (secondary export)', () => {
	it('returns ComponentAnalysis[] for events source', () => {
		const source = makeEventsSource();
		const result = analyzeComponents(source);
		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);
	});

	it('throws EMPTY_SOURCE for empty events', () => {
		expect(() => analyzeComponents({ type: 'events', events: [] })).toThrow(IntelligenceError);
		try { analyzeComponents({ type: 'events', events: [] }); } catch (e) {
			expect((e as IntelligenceError).code).toBe('EMPTY_SOURCE');
		}
	});
});

describe('rankBottlenecks (secondary export)', () => {
	it('returns bottlenecks for a list of components', () => {
		const source = makeEventsSource([
			makeRenderEvent({ componentName: 'A' }),
			makeScoreEvent({ componentName: 'A', score: 20 }),
		]);
		const components = analyzeComponents(source);
		const bottlenecks = rankBottlenecks(components);
		expect(bottlenecks.length).toBeGreaterThan(0);
	});

	it('respects maxBottlenecks option', () => {
		const source = makeEventsSource([makeRenderEvent(), makeScoreEvent()]);
		const components = analyzeComponents(source);
		const bottlenecks = rankBottlenecks(components, { maxBottlenecks: 1 });
		expect(bottlenecks.length).toBeLessThanOrEqual(1);
	});
});
