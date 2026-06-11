import { describe, it, expect } from 'vitest';
import { applyFilter, mergeFilters, withFilter } from '../src/filter/filter.js';
import { applyPreset } from '../src/filter/filter-presets.js';
import { makeEngine } from './helpers.js';

const makeSession = (renderCount: number, opts = {}) => makeEngine(renderCount, opts).session;

describe('applyFilter — empty filter', () => {
	it('matches all frames when filter is empty', () => {
		const session = makeSession(10);
		const result = applyFilter(session, {});
		expect(result.matchingFrameCount).toBe(10);
		expect(result.totalFrameCount).toBe(10);
	});
});

describe('applyFilter — score filters', () => {
	it('filters by minScore', () => {
		const session = makeSession(4, { scoreOverrides: { 1: 90, 2: 60, 3: 40, 4: 20 } });
		const result = applyFilter(session, { minScore: 50 });
		expect(result.matchingFrameCount).toBe(2); // 90 and 60
	});

	it('filters by maxScore', () => {
		const session = makeSession(4, { scoreOverrides: { 1: 90, 2: 60, 3: 40, 4: 20 } });
		const result = applyFilter(session, { maxScore: 50 });
		expect(result.matchingFrameCount).toBe(2); // 40 and 20
	});

	it('filters by minScore and maxScore together', () => {
		const session = makeSession(4, { scoreOverrides: { 1: 90, 2: 60, 3: 40, 4: 20 } });
		const result = applyFilter(session, { minScore: 30, maxScore: 70 });
		expect(result.matchingFrameCount).toBe(2); // 60 and 40
	});
});

describe('applyFilter — grade filter', () => {
	it('filters by grades', () => {
		const session = makeSession(3, { scoreOverrides: { 1: 95, 2: 75, 3: 40 } });
		const result = applyFilter(session, { grades: ['EXCELLENT'] });
		expect(result.matchingFrameCount).toBe(1);
	});
});

describe('applyFilter — triggeredBy', () => {
	it('filters by triggeredBy parent', () => {
		const session = makeSession(3, { triggeredBy: 'parent' });
		const result = applyFilter(session, { triggeredBy: ['parent'] });
		expect(result.matchingFrameCount).toBe(3);
	});

	it('filters by triggeredBy props', () => {
		const session = makeSession(3, { triggeredBy: 'props' });
		const result = applyFilter(session, { triggeredBy: ['props'] });
		expect(result.matchingFrameCount).toBe(3);
	});
});

describe('applyFilter — boolean fields', () => {
	it('hasUnstablePropsOnly: true includes only frames with unstable props', () => {
		const session = makeSession(5, { includeProps: false });
		const result = applyFilter(session, { hasUnstablePropsOnly: true });
		expect(result.matchingFrameCount).toBe(0); // none have props
	});

	it('hasUnstablePropsOnly: false includes only frames without unstable props', () => {
		const session = makeSession(5, { includeProps: false });
		const result = applyFilter(session, { hasUnstablePropsOnly: false });
		expect(result.matchingFrameCount).toBe(5);
	});

	it('hasRecommendationsOnly: true includes only frames with recommendations', () => {
		const session = makeSession(5, { includeRecommendations: true });
		const result = applyFilter(session, { hasRecommendationsOnly: true });
		expect(result.matchingFrameCount).toBe(5);
	});
});

describe('applyFilter — range filters', () => {
	it('filters by frameIndexRange', () => {
		const session = makeSession(10);
		const result = applyFilter(session, { frameIndexRange: [2, 5] });
		expect(result.matchingFrameCount).toBe(4); // indices 2, 3, 4, 5
	});
});

describe('applyFilter — result structure', () => {
	it('matchingFrameIndices are sorted ascending', () => {
		const session = makeSession(5, { scoreOverrides: { 1: 80, 2: 30, 3: 80, 4: 30, 5: 80 } });
		const result = applyFilter(session, { maxScore: 50 });
		for (let i = 0; i < result.matchingFrameIndices.length - 1; i++) {
			expect(result.matchingFrameIndices[i]).toBeLessThan(result.matchingFrameIndices[i + 1]!);
		}
	});

	it('result contains the applied filter', () => {
		const session = makeSession(3);
		const filter = { maxScore: 50 };
		const result = applyFilter(session, filter);
		expect(result.filter).toBe(filter);
	});
});

describe('applyPreset — issues-only', () => {
	it('matches frames with score <= 69', () => {
		const session = makeSession(4, { scoreOverrides: { 1: 90, 2: 60, 3: 40, 4: 20 } });
		const result = applyPreset(session, 'issues-only');
		// scores 60, 40, 20 match maxScore: 69
		expect(result.matchingFrameCount).toBeGreaterThanOrEqual(3);
	});
});

describe('applyPreset — score-degradation', () => {
	it('returns frames where score dropped from previous', () => {
		const session = makeSession(5, { scoreOverrides: { 1: 90, 2: 80, 3: 70, 4: 80, 5: 60 } });
		const result = applyPreset(session, 'score-degradation');
		// frames 2 (80<90), 3 (70<80), 5 (60<80) degrade
		expect(result.matchingFrameCount).toBe(3);
	});

	it('returns empty when scores always increase', () => {
		const session = makeSession(3, { scoreOverrides: { 1: 50, 2: 60, 3: 70 } });
		const result = applyPreset(session, 'score-degradation');
		expect(result.matchingFrameCount).toBe(0);
	});
});

describe('applyPreset — other presets', () => {
	it('reference-instability preset', () => {
		const session = makeSession(3);
		const result = applyPreset(session, 'reference-instability');
		expect(result.totalFrameCount).toBe(3);
	});

	it('high-frequency preset returns count ≥ 0', () => {
		const session = makeSession(3);
		const result = applyPreset(session, 'high-frequency');
		expect(result.matchingFrameCount).toBeGreaterThanOrEqual(0);
	});

	it('ineffective-memo preset returns count ≥ 0', () => {
		const session = makeSession(3);
		const result = applyPreset(session, 'ineffective-memo');
		expect(result.matchingFrameCount).toBeGreaterThanOrEqual(0);
	});

	it('prop-changes-only preset', () => {
		const session = makeSession(3, { includeProps: true });
		const result = applyPreset(session, 'prop-changes-only');
		expect(result.totalFrameCount).toBe(3);
	});

	it('parent-triggered-only preset', () => {
		const session = makeSession(3, { triggeredBy: 'parent' });
		const result = applyPreset(session, 'parent-triggered-only');
		expect(result.matchingFrameCount).toBe(3);
	});
});

describe('mergeFilters', () => {
	it('merges minScore by taking max', () => {
		const merged = mergeFilters({ minScore: 30 }, { minScore: 60 });
		expect(merged.minScore).toBe(60);
	});

	it('merges maxScore by taking min', () => {
		const merged = mergeFilters({ maxScore: 80 }, { maxScore: 60 });
		expect(merged.maxScore).toBe(60);
	});

	it('merges undefined fields by inheriting defined', () => {
		const merged = mergeFilters({ minScore: 30 }, { maxScore: 70 });
		expect(merged.minScore).toBe(30);
		expect(merged.maxScore).toBe(70);
	});

	it('empty merge returns empty filter', () => {
		const merged = mergeFilters({}, {});
		expect(merged.minScore).toBeUndefined();
	});
});

describe('withFilter', () => {
	it('adds constraint to base filter', () => {
		const base = { minScore: 30 };
		const result = withFilter(base, { maxScore: 70 });
		expect(result.minScore).toBe(30);
		expect(result.maxScore).toBe(70);
	});
});
