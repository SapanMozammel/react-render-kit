import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeRootCauses } from '../src/root-cause/root-cause-analyzer.js';
import { resetSeq, makeComponentAnalysis } from './helpers.js';
import type { CorrelationGroup } from '../src/types/index.js';

beforeEach(() => resetSeq());

describe('analyzeRootCauses', () => {
	it('returns empty array for empty components', () => {
		expect(analyzeRootCauses([], [], 0.3)).toHaveLength(0);
	});

	it('detects reference-instability root cause', () => {
		const c = makeComponentAnalysis({
			componentName: 'A',
			totalRenders: 10,
			unstablePropNames: ['onClick'],
			unstablePropTypes: ['function'],
			ineffectiveRenderCount: 6,
		});
		const result = analyzeRootCauses([c], [], 0.3);
		const cause = result.find((r) => r.componentName === 'A');
		expect(cause).toBeDefined();
		expect(cause!.kind).toBe('reference-instability');
	});

	it('detects memo-defeat root cause when INEFFECTIVE and unstable props', () => {
		const c = makeComponentAnalysis({
			componentName: 'B',
			totalRenders: 10,
			memoClassification: 'INEFFECTIVE',
			unstablePropNames: ['value'],
			unstablePropTypes: ['object'],
			ineffectiveRenderCount: 10,
		});
		const result = analyzeRootCauses([c], [], 0.3);
		const cause = result.find((r) => r.componentName === 'B');
		expect(cause).toBeDefined();
		expect(cause!.kind).toBe('memo-defeat');
	});

	it('detects parent-cascade root cause when >50% no-change renders', () => {
		const c = makeComponentAnalysis({
			componentName: 'C',
			totalRenders: 10,
			noChangeRenderCount: 7,
		});
		const result = analyzeRootCauses([c], [], 0.3);
		const cause = result.find((r) => r.componentName === 'C');
		expect(cause).toBeDefined();
		expect(cause!.kind).toBe('parent-cascade');
	});

	it('detects high-frequency-source root cause', () => {
		const c = makeComponentAnalysis({
			componentName: 'D',
			frequencyClass: 'HIGH',
			renderVelocity: 10,
		});
		const result = analyzeRootCauses([c], [], 0.3);
		const cause = result.find((r) => r.componentName === 'D');
		expect(cause).toBeDefined();
		expect(cause!.kind).toBe('high-frequency-source');
	});

	it('emits at most one RootCause per component', () => {
		const c = makeComponentAnalysis({
			componentName: 'E',
			totalRenders: 10,
			memoClassification: 'INEFFECTIVE',
			unstablePropNames: ['x'],
			unstablePropTypes: ['function'],
			ineffectiveRenderCount: 10,
			frequencyClass: 'HIGH',
			renderVelocity: 8,
		});
		const causes = analyzeRootCauses([c], [], 0.3).filter((r) => r.componentName === 'E');
		expect(causes).toHaveLength(1);
	});

	it('respects confidenceThreshold — skips below threshold', () => {
		const c = makeComponentAnalysis({
			componentName: 'F',
			totalRenders: 10,
			noChangeRenderCount: 6,
		});
		// parent-cascade confidence ~ 0.6, should pass 0.3 but fail 0.9
		const highThreshold = analyzeRootCauses([c], [], 0.9);
		expect(highThreshold.find((r) => r.componentName === 'F')).toBeUndefined();

		const lowThreshold = analyzeRootCauses([c], [], 0.3);
		expect(lowThreshold.find((r) => r.componentName === 'F')).toBeDefined();
	});

	it('populates affectedComponents from correlations for memo-defeat', () => {
		const c = makeComponentAnalysis({
			componentName: 'Parent',
			totalRenders: 15,
			memoClassification: 'INEFFECTIVE',
			unstablePropNames: ['cb'],
			unstablePropTypes: ['function'],
			ineffectiveRenderCount: 15,
		});
		const correlations: CorrelationGroup[] = [
			{
				type: 'probable-cascade',
				components: ['Parent', 'Child'],
				confidence: 0.9,
				description: 'Parent triggers Child',
				evidence: [],
			},
		];
		const result = analyzeRootCauses([c], correlations, 0.3);
		const cause = result.find((r) => r.componentName === 'Parent');
		expect(cause?.affectedComponents).toContain('Child');
	});

	it('sorts results by confidence descending', () => {
		const components = [
			makeComponentAnalysis({ componentName: 'Low', totalRenders: 10, noChangeRenderCount: 6 }),
			makeComponentAnalysis({
				componentName: 'High',
				totalRenders: 10,
				memoClassification: 'INEFFECTIVE',
				unstablePropNames: ['f'],
				unstablePropTypes: ['function'],
				ineffectiveRenderCount: 10,
			}),
		];
		const result = analyzeRootCauses(components, [], 0.3);
		expect(result[0]!.confidence).toBeGreaterThanOrEqual(result[result.length - 1]!.confidence);
	});

	it('returns frozen array', () => {
		const result = analyzeRootCauses([], [], 0.3);
		expect(Object.isFrozen(result)).toBe(true);
	});
});
