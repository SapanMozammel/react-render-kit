import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FrequencyMeter } from '../../src/components/frequency-meter.js';
import type { InsightReport } from '@sapanmozammel/render-insights';

type Frequency = InsightReport['frequency'];

const makeFrequency = (overrides?: Partial<Frequency>): Frequency => ({
	totalRenders: 3,
	windowCount: 3,
	windowMs: 1000,
	rate: 3.0,
	classification: 'LOW',
	...overrides,
});

describe('FrequencyMeter', () => {
	it('renders the classification label for LOW', () => {
		const { getByText } = render(<FrequencyMeter frequency={makeFrequency({ classification: 'LOW' })} />);
		expect(getByText('LOW')).toBeDefined();
	});

	it('renders the classification label for HIGH', () => {
		const { getByText } = render(<FrequencyMeter frequency={makeFrequency({ classification: 'HIGH', rate: 12 })} />);
		expect(getByText('HIGH')).toBeDefined();
	});

	it('renders the classification label for MODERATE', () => {
		const { getByText } = render(<FrequencyMeter frequency={makeFrequency({ classification: 'MODERATE', rate: 5 })} />);
		expect(getByText('MODERATE')).toBeDefined();
	});

	it('shows rate for non-NOT_ENOUGH_DATA classifications', () => {
		const { getByText } = render(<FrequencyMeter frequency={makeFrequency({ classification: 'LOW', rate: 2.5 })} />);
		expect(getByText('2.5/s')).toBeDefined();
	});

	it('hides rate for NOT_ENOUGH_DATA', () => {
		const { queryByText } = render(<FrequencyMeter frequency={makeFrequency({ classification: 'NOT_ENOUGH_DATA', rate: 0 })} />);
		expect(queryByText(/\/s/)).toBeNull();
	});

	it('renders "NOT_ENOUGH_DATA" label', () => {
		const { getByText } = render(<FrequencyMeter frequency={makeFrequency({ classification: 'NOT_ENOUGH_DATA', rate: 0 })} />);
		expect(getByText('NOT_ENOUGH_DATA')).toBeDefined();
	});
});
