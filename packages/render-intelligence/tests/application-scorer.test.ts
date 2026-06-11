import { describe, it, expect, beforeEach } from 'vitest';
import { scoreApplication } from '../src/scorer/application-scorer.js';
import { resetSeq, makeComponentAnalysis } from './helpers.js';

beforeEach(() => resetSeq());

describe('scoreApplication', () => {
	it('returns zero score and CRITICAL grade for empty components', () => {
		const result = scoreApplication([], 'events');
		expect(result.score).toBe(0);
		expect(result.grade).toBe('CRITICAL');
		expect(result.componentCount).toBe(0);
		expect(result.totalRenders).toBe(0);
		expect(result.analysisSource).toBe('events');
	});

	it('computes weighted average score by render count', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 80, averageScore: 80 }), makeComponentAnalysis({ componentName: 'B', totalRenders: 20, averageScore: 40 })];
		// Weighted: (80*0.8 + 40*0.2) = 64+8 = 72
		const result = scoreApplication(components, 'snapshot');
		expect(result.score).toBe(72);
		expect(result.grade).toBe('GOOD');
	});

	it('counts healthy, degraded, and critical components correctly', () => {
		const components = [
			makeComponentAnalysis({ componentName: 'A', totalRenders: 10, averageScore: 90 }), // healthy
			makeComponentAnalysis({ componentName: 'B', totalRenders: 10, averageScore: 50 }), // degraded (30-69)
			makeComponentAnalysis({ componentName: 'C', totalRenders: 10, averageScore: 20 }), // critical (<30)
		];
		const result = scoreApplication(components, 'events');
		expect(result.healthyCount).toBe(1);
		expect(result.degradedCount).toBe(1);
		expect(result.criticalCount).toBe(1);
	});

	it('assigns correct grade EXCELLENT for score >= 90', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 10, averageScore: 95 })];
		expect(scoreApplication(components, 'events').grade).toBe('EXCELLENT');
	});

	it('assigns MODERATE grade for score 50-69', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 10, averageScore: 60 })];
		expect(scoreApplication(components, 'events').grade).toBe('MODERATE');
	});

	it('assigns POOR grade for score 30-49', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 10, averageScore: 40 })];
		expect(scoreApplication(components, 'events').grade).toBe('POOR');
	});

	it('returns totalRenders as sum across all components', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 30, averageScore: 80 }), makeComponentAnalysis({ componentName: 'B', totalRenders: 70, averageScore: 70 })];
		expect(scoreApplication(components, 'events').totalRenders).toBe(100);
	});

	it('falls back to equal weights when totalRenders is 0', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 0, averageScore: 80 }), makeComponentAnalysis({ componentName: 'B', totalRenders: 0, averageScore: 40 })];
		// Equal weights: (80+40)/2 = 60
		const result = scoreApplication(components, 'events');
		expect(result.score).toBe(60);
	});

	it('preserves analysisSource in result', () => {
		const components = [makeComponentAnalysis({ componentName: 'A', totalRenders: 5, averageScore: 70 })];
		expect(scoreApplication(components, 'replay').analysisSource).toBe('replay');
	});
});
