import { describe, it, expect, beforeEach } from 'vitest';
import { rankBottlenecks } from '../src/ranker/bottleneck-ranker.js';
import { resetSeq, makeComponentAnalysis } from './helpers.js';

beforeEach(() => resetSeq());

describe('rankBottlenecks', () => {
	it('returns empty for empty components', () => {
		expect(rankBottlenecks([], [], 10)).toHaveLength(0);
	});

	it('limits results to maxBottlenecks', () => {
		const components = Array.from({ length: 5 }, (_, i) =>
			makeComponentAnalysis({ componentName: `C${i}`, totalRenders: 10, averageScore: 50 - i }),
		);
		expect(rankBottlenecks(components, [], 3)).toHaveLength(3);
	});

	it('ranks by impactScore descending', () => {
		const components = [
			makeComponentAnalysis({ componentName: 'A', totalRenders: 10, averageScore: 90 }),
			makeComponentAnalysis({ componentName: 'B', totalRenders: 10, averageScore: 20 }),
		];
		const result = rankBottlenecks(components, [], 10);
		expect(result[0]!.componentName).toBe('B');
		expect(result[1]!.componentName).toBe('A');
	});

	it('assigns rank 1, 2, 3... in order', () => {
		const components = [
			makeComponentAnalysis({ componentName: 'A', totalRenders: 10, averageScore: 50 }),
			makeComponentAnalysis({ componentName: 'B', totalRenders: 10, averageScore: 40 }),
			makeComponentAnalysis({ componentName: 'C', totalRenders: 10, averageScore: 30 }),
		];
		const result = rankBottlenecks(components, [], 10);
		result.forEach((b, i) => expect(b.rank).toBe(i + 1));
	});

	it('detects ineffective-memo category when memo is INEFFECTIVE and props are unstable', () => {
		const c = makeComponentAnalysis({
			componentName: 'A',
			totalRenders: 10,
			averageScore: 30,
			memoClassification: 'INEFFECTIVE',
			unstablePropNames: ['onClick'],
			unstablePropTypes: ['function'],
		});
		const result = rankBottlenecks([c], [], 10);
		expect(result[0]!.category).toBe('ineffective-memo');
	});

	it('detects reference-instability when only unstable props present', () => {
		const c = makeComponentAnalysis({
			componentName: 'A',
			totalRenders: 10,
			averageScore: 50,
			unstablePropNames: ['style'],
			unstablePropTypes: ['object'],
			memoClassification: null,
		});
		const result = rankBottlenecks([c], [], 10);
		expect(result[0]!.category).toBe('reference-instability');
	});

	it('detects high-frequency category', () => {
		const c = makeComponentAnalysis({
			componentName: 'A',
			totalRenders: 10,
			averageScore: 50,
			frequencyClass: 'HIGH',
		});
		const result = rankBottlenecks([c], [], 10);
		expect(result[0]!.category).toBe('high-frequency');
	});

	it('detects parent-cascade when >60% renders have no change', () => {
		const c = makeComponentAnalysis({
			componentName: 'A',
			totalRenders: 10,
			noChangeRenderCount: 7,
			averageScore: 50,
		});
		const result = rankBottlenecks([c], [], 10);
		expect(result[0]!.category).toBe('parent-cascade');
	});

	it('breaks ties alphabetically by componentName', () => {
		const components = [
			makeComponentAnalysis({ componentName: 'Beta', totalRenders: 10, averageScore: 50 }),
			makeComponentAnalysis({ componentName: 'Alpha', totalRenders: 10, averageScore: 50 }),
		];
		const result = rankBottlenecks(components, [], 10);
		expect(result[0]!.componentName).toBe('Alpha');
	});

	it('adds instability bonus for unstable props', () => {
		const withProps = makeComponentAnalysis({
			componentName: 'A',
			totalRenders: 10,
			averageScore: 50,
			unstablePropNames: ['p1', 'p2', 'p3'],
			unstablePropTypes: ['object', 'object', 'object'],
		});
		const withoutProps = makeComponentAnalysis({
			componentName: 'B',
			totalRenders: 10,
			averageScore: 50,
		});
		const result = rankBottlenecks([withoutProps, withProps], [], 10);
		expect(result[0]!.componentName).toBe('A');
	});

	it('returns frozen array', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 5, averageScore: 40 })];
		expect(Object.isFrozen(rankBottlenecks(components, [], 10))).toBe(true);
	});
});
