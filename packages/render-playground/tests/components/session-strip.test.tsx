import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SessionStrip } from '../../src/components/session-strip.js';
import type { SessionStats } from '../../src/types/index.js';

const makeStats = (overrides?: Partial<SessionStats>): SessionStats => ({
	windowSize: 5,
	mostFrequentTrigger: 'no-prop-change',
	mostUnstableProp: null,
	mostUnstablePropOccurrences: 0,
	scoreTrend: 'stable',
	memoTrend: 'stable',
	averageScore: 80,
	worstScore: 60,
	bestScore: 100,
	...overrides,
});

describe('SessionStrip', () => {
	it('returns null when windowSize < 3', () => {
		const { container } = render(<SessionStrip stats={makeStats({ windowSize: 2 })} totalReports={2} />);
		expect(container.firstChild).toBeNull();
	});

	it('returns null when windowSize is 0', () => {
		const { container } = render(<SessionStrip stats={makeStats({ windowSize: 0 })} totalReports={0} />);
		expect(container.firstChild).toBeNull();
	});

	it('renders when windowSize is exactly 3', () => {
		const { container } = render(<SessionStrip stats={makeStats({ windowSize: 3 })} totalReports={3} />);
		expect(container.firstChild).not.toBeNull();
	});

	it('shows ↑ for improving trend', () => {
		const { getByText } = render(<SessionStrip stats={makeStats({ scoreTrend: 'improving' })} totalReports={5} />);
		expect(getByText(/↑/)).toBeDefined();
	});

	it('shows ↓ for degrading trend', () => {
		const { getByText } = render(<SessionStrip stats={makeStats({ scoreTrend: 'degrading' })} totalReports={5} />);
		expect(getByText(/↓/)).toBeDefined();
	});

	it('shows → for stable trend', () => {
		const { getByText } = render(<SessionStrip stats={makeStats({ scoreTrend: 'stable' })} totalReports={5} />);
		expect(getByText(/→/)).toBeDefined();
	});

	it('renders totalReports count', () => {
		const { getByText } = render(<SessionStrip stats={makeStats()} totalReports={12} />);
		expect(getByText('12 renders')).toBeDefined();
	});

	it('renders averageScore', () => {
		const { getByText } = render(<SessionStrip stats={makeStats({ averageScore: 75 })} totalReports={5} />);
		expect(getByText('avg 75')).toBeDefined();
	});

	it('renders mostUnstableProp when non-null', () => {
		const { getByText } = render(<SessionStrip stats={makeStats({ mostUnstableProp: 'onClick' })} totalReports={5} />);
		expect(getByText('onClick')).toBeDefined();
	});

	it('does not render mostUnstableProp section when null', () => {
		const { queryByText } = render(<SessionStrip stats={makeStats({ mostUnstableProp: null })} totalReports={5} />);
		expect(queryByText('most unstable:')).toBeNull();
	});
});
