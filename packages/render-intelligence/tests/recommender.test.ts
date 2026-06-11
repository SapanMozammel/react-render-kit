import { describe, it, expect, beforeEach } from 'vitest';
import { generateRecommendations } from '../src/recommender/intelligence-recommender.js';
import { resetSeq, makeComponentAnalysis } from './helpers.js';
import type { ApplicationHealth, CorrelationGroup } from '../src/types/index.js';

beforeEach(() => resetSeq());

const makeHealth = (overrides: Partial<ApplicationHealth> = {}): ApplicationHealth => ({
	score: 80,
	grade: 'GOOD',
	componentCount: 1,
	healthyCount: 1,
	degradedCount: 0,
	criticalCount: 0,
	totalRenders: 10,
	analysisSource: 'events',
	...overrides,
});

describe('generateRecommendations', () => {
	it('returns WELL-001 when app score >=90 and no actionable issues', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 10, averageScore: 95 }), makeComponentAnalysis({ componentName: 'B', totalRenders: 10, averageScore: 95 })];
		const health = makeHealth({ score: 95, grade: 'EXCELLENT', componentCount: 2, healthyCount: 2 });
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 20 });
		expect(result.some((r) => r.id === 'R-INTEL-WELL-001')).toBe(true);
	});

	it('fires FUNC-001 for components with unstable function props and >30% ineffective renders', () => {
		const components = [
			makeComponentAnalysis({
				componentName: 'A',
				totalRenders: 10,
				ineffectiveRenderCount: 4,
				unstablePropNames: ['onClick'],
				unstablePropTypes: ['function'],
			}),
		];
		const health = makeHealth({ score: 60, grade: 'MODERATE' });
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 20 });
		expect(result.some((r) => r.id === 'R-INTEL-FUNC-001')).toBe(true);
	});

	it('fires MEMO-001 for components with INEFFECTIVE memo and score < 50', () => {
		const components = [
			makeComponentAnalysis({
				componentName: 'A',
				totalRenders: 10,
				averageScore: 30,
				memoClassification: 'INEFFECTIVE',
				ineffectiveRenderCount: 10,
			}),
		];
		const health = makeHealth({ score: 30, grade: 'POOR', criticalCount: 1, healthyCount: 0 });
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 20 });
		expect(result.some((r) => r.id === 'R-INTEL-MEMO-001')).toBe(true);
		expect(result.find((r) => r.id === 'R-INTEL-MEMO-001')!.severity).toBe('CRITICAL');
	});

	it('fires FREQ-001 for HIGH frequency components', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 10, frequencyClass: 'HIGH', renderVelocity: 5 })];
		const health = makeHealth({ score: 60, grade: 'MODERATE' });
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 20 });
		expect(result.some((r) => r.id === 'R-INTEL-FREQ-001')).toBe(true);
	});

	it('fires PARENT-001 when >60% parent-triggered renders', () => {
		const components = [
			makeComponentAnalysis({
				componentName: 'A',
				totalRenders: 10,
				noChangeRenderCount: 7,
			}),
		];
		const health = makeHealth({ score: 60, grade: 'MODERATE' });
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 20 });
		expect(result.some((r) => r.id === 'R-INTEL-PARENT-001')).toBe(true);
	});

	it('fires TREND-001 when score is degrading and max-avg > 20', () => {
		const components = [
			makeComponentAnalysis({
				componentName: 'A',
				totalRenders: 10,
				averageScore: 40,
				maxScore: 85,
				scoreTrend: 'degrading',
			}),
		];
		const health = makeHealth({ score: 40, grade: 'POOR' });
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 20 });
		expect(result.some((r) => r.id === 'R-INTEL-TREND-001')).toBe(true);
	});

	it('fires CASC-001 for probable-cascade correlations with confidence >= 0.6', () => {
		const correlations: CorrelationGroup[] = [
			{
				type: 'probable-cascade',
				components: ['Parent', 'Child'],
				confidence: 0.85,
				description: 'Parent triggers Child',
				evidence: [],
			},
		];
		const health = makeHealth({ score: 60, grade: 'MODERATE' });
		const result = generateRecommendations([], [], [], correlations, health, { maxRecommendations: 20 });
		expect(result.some((r) => r.id === 'R-INTEL-CASC-001')).toBe(true);
	});

	it('fires APP-001 when >30% components are degraded or critical', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 10, averageScore: 20 }), makeComponentAnalysis({ componentName: 'B', totalRenders: 10, averageScore: 20 })];
		const health = makeHealth({ score: 20, grade: 'CRITICAL', componentCount: 2, criticalCount: 2, healthyCount: 0 });
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 20 });
		expect(result.some((r) => r.id === 'R-INTEL-APP-001')).toBe(true);
	});

	it('fires COV-001 when only 1 component is tracked', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 10, averageScore: 50 })];
		const health = makeHealth({ score: 50, grade: 'MODERATE', componentCount: 1 });
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 20 });
		expect(result.some((r) => r.id === 'R-INTEL-COV-001')).toBe(true);
	});

	it('respects maxRecommendations limit', () => {
		const components = Array.from({ length: 10 }, (_, i) =>
			makeComponentAnalysis({
				componentName: `C${i}`,
				totalRenders: 10,
				averageScore: 30,
				memoClassification: 'INEFFECTIVE',
				ineffectiveRenderCount: 10,
			})
		);
		const health = makeHealth({ score: 20, grade: 'CRITICAL', componentCount: 10, criticalCount: 10, healthyCount: 0 });
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 3 });
		expect(result.length).toBeLessThanOrEqual(3);
	});

	it('deduplicates recommendations with same id and componentName', () => {
		const components = [
			makeComponentAnalysis({
				componentName: 'A',
				totalRenders: 10,
				ineffectiveRenderCount: 4,
				unstablePropNames: ['onClick'],
				unstablePropTypes: ['function'],
			}),
		];
		const health = makeHealth({ score: 60, grade: 'MODERATE' });
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 20 });
		const funcRecs = result.filter((r) => r.id === 'R-INTEL-FUNC-001' && r.componentName === 'A');
		expect(funcRecs).toHaveLength(1);
	});

	it('caps INFO recommendations at 2 when mixed with higher-severity', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 10, averageScore: 30, memoClassification: 'INEFFECTIVE', ineffectiveRenderCount: 10 })];
		const health = makeHealth({
			score: 30,
			grade: 'POOR',
			criticalCount: 1,
			healthyCount: 0,
			componentCount: 1,
		});
		const result = generateRecommendations(components, [], [], [], health, { maxRecommendations: 20, includeWellOptimized: true });
		const infoRecs = result.filter((r) => r.severity === 'INFO');
		expect(infoRecs.length).toBeLessThanOrEqual(2);
	});

	it('returns frozen array', () => {
		const health = makeHealth();
		const result = generateRecommendations([], [], [], [], health, { maxRecommendations: 20 });
		expect(Object.isFrozen(result)).toBe(true);
	});
});
