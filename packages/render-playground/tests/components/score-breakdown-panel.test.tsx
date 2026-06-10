import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ScoreBreakdownPanel } from '../../src/components/score-breakdown-panel.js';
import type { ScoreBreakdown } from '../../src/types/index.js';

const makeBreakdown = (overrides?: Partial<ScoreBreakdown>): ScoreBreakdown => ({
	total: 85,
	frequencyPenalty: 0,
	instabilityPenalty: 8,
	memoPenalty: 0,
	mixedSignalPenalty: 0,
	components: [
		{ label: 'Frequency', penalty: 0, explanation: 'LOW frequency — no penalty' },
		{ label: 'Prop Instability', penalty: 8, explanation: '1 unstable prop × 8 = −8 pts' },
		{ label: 'Memo Effectiveness', penalty: 0, explanation: 'NOT_APPLICABLE — no penalty' },
		{ label: 'Mixed Signals', penalty: 0, explanation: 'No mixed renders in window' },
	],
	...overrides,
});

describe('ScoreBreakdownPanel', () => {
	it('renders the [Why N?] button', () => {
		const { getByRole } = render(<ScoreBreakdownPanel score={85} breakdown={makeBreakdown()} />);
		const btn = getByRole('button', { name: /Why 85/i });
		expect(btn).toBeDefined();
	});

	it('starts collapsed (aria-expanded false)', () => {
		const { getByRole } = render(<ScoreBreakdownPanel score={85} breakdown={makeBreakdown()} />);
		const btn = getByRole('button', { name: /Why 85/i });
		expect(btn.getAttribute('aria-expanded')).toBe('false');
	});

	it('expands on click, showing breakdown rows', async () => {
		const user = userEvent.setup();
		const { getByRole, getByText } = render(<ScoreBreakdownPanel score={85} breakdown={makeBreakdown()} />);
		await user.click(getByRole('button', { name: /Why 85/i }));
		expect(getByText('Frequency')).toBeDefined();
		expect(getByText('Prop Instability')).toBeDefined();
	});

	it('sets aria-expanded true when open', async () => {
		const user = userEvent.setup();
		const { getByRole } = render(<ScoreBreakdownPanel score={85} breakdown={makeBreakdown()} />);
		const btn = getByRole('button', { name: /Why 85/i });
		await user.click(btn);
		expect(btn.getAttribute('aria-expanded')).toBe('true');
	});

	it('collapses on second click', async () => {
		const user = userEvent.setup();
		const { getByRole, queryByText } = render(<ScoreBreakdownPanel score={85} breakdown={makeBreakdown()} />);
		const btn = getByRole('button', { name: /Why 85/i });
		await user.click(btn);
		await user.click(btn);
		expect(btn.getAttribute('aria-expanded')).toBe('false');
		expect(queryByText('Frequency')).toBeNull();
	});

	it('renders penalty values for each component', async () => {
		const user = userEvent.setup();
		const { getByRole, getByText } = render(<ScoreBreakdownPanel score={85} breakdown={makeBreakdown()} />);
		await user.click(getByRole('button', { name: /Why 85/i }));
		// Prop Instability has penalty 8 → shown as −8
		expect(getByText('−8')).toBeDefined();
		// Frequency has penalty 0 → shown as 0
		const zeros = document.querySelectorAll('span');
		const hasZero = Array.from(zeros).some((el) => el.textContent === '0');
		expect(hasZero).toBe(true);
	});
});
