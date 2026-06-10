import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecommendationsSection } from '../../src/components/recommendations-section.js';
import type { Recommendation } from '../../src/types/index.js';

const makeRec = (id: string): Recommendation => ({
	id,
	category: 'well-optimized',
	severity: 'INFO',
	title: `Rec ${id}`,
	explanation: 'explanation',
	fix: 'fix',
	expectedImpact: 'impact',
	confidence: 1,
	evidence: [],
});

describe('RecommendationsSection', () => {
	it('returns null for empty array', () => {
		const { container } = render(<RecommendationsSection recommendations={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it('renders one card for a single recommendation', () => {
		const { getByText, queryByText } = render(<RecommendationsSection recommendations={[makeRec('R1')]} />);
		expect(getByText('Rec R1')).toBeDefined();
		expect(queryByText(/more recommendation/)).toBeNull();
	});

	it('renders three cards for three recommendations without overflow', () => {
		const recs = [makeRec('R1'), makeRec('R2'), makeRec('R3')];
		const { getByText, queryByText } = render(<RecommendationsSection recommendations={recs} />);
		expect(getByText('Rec R1')).toBeDefined();
		expect(getByText('Rec R3')).toBeDefined();
		expect(queryByText(/more recommendation/)).toBeNull();
	});

	it('shows "+1 more recommendation" for four recommendations', () => {
		const recs = [makeRec('R1'), makeRec('R2'), makeRec('R3'), makeRec('R4')];
		const { getByText, queryByText } = render(<RecommendationsSection recommendations={recs} />);
		expect(getByText(/\+1 more recommendation/)).toBeDefined();
		expect(queryByText('Rec R4')).toBeNull();
	});

	it('shows "+2 more recommendations" for five recommendations', () => {
		const recs = [makeRec('R1'), makeRec('R2'), makeRec('R3'), makeRec('R4'), makeRec('R5')];
		const { getByText } = render(<RecommendationsSection recommendations={recs} />);
		expect(getByText(/\+2 more recommendations/)).toBeDefined();
	});

	it('renders the Recommendations section header', () => {
		const { getByText } = render(<RecommendationsSection recommendations={[makeRec('R1')]} />);
		expect(getByText('Recommendations')).toBeDefined();
	});
});
