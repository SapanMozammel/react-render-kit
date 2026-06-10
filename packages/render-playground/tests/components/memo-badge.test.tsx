import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoBadge } from '../../src/components/memo-badge.js';

describe('MemoBadge', () => {
	it('renders "Effective" for EFFECTIVE', () => {
		const { getByText } = render(<MemoBadge classification='EFFECTIVE' />);
		expect(getByText('Effective')).toBeDefined();
	});

	it('renders "N/A" for NOT_APPLICABLE', () => {
		const { getByText } = render(<MemoBadge classification='NOT_APPLICABLE' />);
		expect(getByText('N/A')).toBeDefined();
	});

	it('renders "Ineffective" for INEFFECTIVE', () => {
		const { getByText } = render(<MemoBadge classification='INEFFECTIVE' />);
		expect(getByText('Ineffective')).toBeDefined();
	});

	it('renders "Partial" for PARTIALLY_EFFECTIVE', () => {
		const { getByText } = render(<MemoBadge classification='PARTIALLY_EFFECTIVE' />);
		expect(getByText('Partial')).toBeDefined();
	});

	it('applies uppercase text transform', () => {
		const { container } = render(<MemoBadge classification='EFFECTIVE' />);
		const span = container.querySelector('span');
		expect(span?.style.textTransform).toBe('uppercase');
	});
});
