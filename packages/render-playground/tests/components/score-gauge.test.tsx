import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScoreGauge } from '../../src/components/score-gauge.js';

describe('ScoreGauge', () => {
	it('renders an SVG element', () => {
		const { container } = render(<ScoreGauge score={75} grade='GOOD' />);
		expect(container.querySelector('svg')).not.toBeNull();
	});

	it('has role="img" for accessibility', () => {
		render(<ScoreGauge score={75} grade='GOOD' />);
		expect(screen.getByRole('img')).toBeTruthy();
	});

	it('aria-label includes the score and grade label', () => {
		render(<ScoreGauge score={75} grade='GOOD' />);
		const el = screen.getByRole('img');
		expect(el.getAttribute('aria-label')).toMatch(/75/);
		expect(el.getAttribute('aria-label')).toMatch(/Good/);
	});

	it('renders score=0 without error', () => {
		expect(() => render(<ScoreGauge score={0} grade='CRITICAL' />)).not.toThrow();
	});

	it('renders score=100 without error', () => {
		expect(() => render(<ScoreGauge score={100} grade='EXCELLENT' />)).not.toThrow();
	});

	it('renders two circle elements (background + foreground arc)', () => {
		const { container } = render(<ScoreGauge score={50} grade='MODERATE' />);
		const circles = container.querySelectorAll('circle');
		expect(circles.length).toBeGreaterThanOrEqual(2);
	});

	it('foreground circle has strokeDashoffset=0 for score=100', () => {
		const { container } = render(<ScoreGauge score={100} grade='EXCELLENT' />);
		const circles = container.querySelectorAll('circle');
		// The second circle is the filled arc
		const filled = circles[1];
		expect(filled.getAttribute('stroke-dashoffset')).toBe('0');
	});
});
