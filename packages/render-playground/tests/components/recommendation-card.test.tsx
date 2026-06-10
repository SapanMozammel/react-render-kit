import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecommendationCard } from '../../src/components/recommendation-card.js';
import type { Recommendation } from '../../src/types/index.js';

const makeCriticalRec = (overrides?: Partial<Recommendation>): Recommendation => ({
	id: 'R-FUNC-001',
	category: 'unstable-function',
	severity: 'CRITICAL',
	title: 'Unstable function prop: onClick',
	explanation: 'onClick recreates on every parent render.',
	fix: 'Wrap onClick in useCallback.',
	expectedImpact: 'Eliminates reference-only renders.',
	confidence: 0.8,
	evidence: [{ type: 'unstable-prop', propName: 'onClick', refType: 'function', occurrences: 5 }],
	...overrides,
});

const makeInfoRec = (): Recommendation => ({
	id: 'R-CLEAR-001',
	category: 'well-optimized',
	severity: 'INFO',
	title: 'Component is well-optimized',
	explanation: 'No issues detected.',
	fix: 'No action required.',
	expectedImpact: 'Continue monitoring.',
	confidence: 1,
	evidence: [],
});

describe('RecommendationCard', () => {
	it('renders the recommendation title', () => {
		render(<RecommendationCard recommendation={makeCriticalRec()} />);
		expect(screen.getByText('Unstable function prop: onClick')).toBeTruthy();
	});

	it('CRITICAL recommendation starts expanded', () => {
		render(<RecommendationCard recommendation={makeCriticalRec()} />);
		expect(screen.getByText('Wrap onClick in useCallback.')).toBeTruthy();
	});

	it('INFO recommendation starts collapsed', () => {
		render(<RecommendationCard recommendation={makeInfoRec()} />);
		// Fix text should not be visible when collapsed
		expect(screen.queryByText('No action required.')).toBeNull();
	});

	it('clicking toggle button expands a collapsed card', () => {
		render(<RecommendationCard recommendation={makeInfoRec()} />);
		const btn = screen.getByRole('button');
		fireEvent.click(btn);
		expect(screen.getByText('No action required.')).toBeTruthy();
	});

	it('clicking toggle button collapses an expanded card', () => {
		render(<RecommendationCard recommendation={makeCriticalRec()} />);
		const btn = screen.getByRole('button');
		// Should be expanded; click to collapse
		fireEvent.click(btn);
		expect(screen.queryByText('Wrap onClick in useCallback.')).toBeNull();
	});

	it('toggle button has aria-expanded reflecting open state', () => {
		render(<RecommendationCard recommendation={makeCriticalRec()} />);
		const btn = screen.getByRole('button');
		expect(btn.getAttribute('aria-expanded')).toBe('true');
		fireEvent.click(btn);
		expect(btn.getAttribute('aria-expanded')).toBe('false');
	});

	it('renders evidence chips when expanded', () => {
		render(<RecommendationCard recommendation={makeCriticalRec()} />);
		// Evidence chip contains "onClick (function · 5×)"
		const chips = screen.getAllByText(/onClick/);
		expect(chips.length).toBeGreaterThanOrEqual(1);
	});

	it('renders render-pattern evidence chip when expanded', () => {
		const rec = makeCriticalRec({
			evidence: [{ type: 'render-pattern', pattern: 'all-no-change', renderCount: 5 }],
		});
		render(<RecommendationCard recommendation={rec} />);
		expect(screen.getByText(/all-no-change/)).toBeTruthy();
	});

	it('renders severity label in header', () => {
		render(<RecommendationCard recommendation={makeCriticalRec()} />);
		expect(screen.getByText(/CRITICAL/)).toBeTruthy();
	});
});
