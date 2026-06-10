import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PropDiffTable } from '../../src/components/prop-diff-table.js';
import type { InsightReport } from '@sapanmozammel/render-insights';

const makeReport = (overrides?: Partial<InsightReport>): InsightReport => ({
	componentName: 'TestComp',
	renderNumber: 1,
	reportNumber: 1,
	props: { changed: [], unstable: [] },
	frequency: { totalRenders: 1, windowCount: 1, windowMs: 1000, rate: 1, classification: 'LOW' },
	memo: { signalKind: null, sessionClass: 'NOT_APPLICABLE', genuineCount: 0, referenceOnlyCount: 0, mixedCount: 0 },
	score: 100,
	grade: 'EXCELLENT',
	inferredTrigger: 'no-prop-change',
	recommendations: [],
	...overrides,
});

describe('PropDiffTable', () => {
	it('returns null when no changed or unstable props', () => {
		const { container } = render(<PropDiffTable report={makeReport()} />);
		expect(container.firstChild).toBeNull();
	});

	it('renders value-changed entry with prev → next format', () => {
		const report = makeReport({
			props: {
				changed: [{ key: 'title', kind: 'value-changed', prev: 'old', next: 'new' }],
				unstable: [],
			},
		});
		const { getByText } = render(<PropDiffTable report={report} />);
		expect(getByText('title')).toBeDefined();
		expect(getByText(/"old" → "new"/)).toBeDefined();
	});

	it('renders reference-changed entry with refType', () => {
		const report = makeReport({
			props: {
				changed: [{ key: 'onClick', kind: 'reference-changed', refType: 'function' }],
				unstable: [],
			},
		});
		const { getByText } = render(<PropDiffTable report={report} />);
		expect(getByText('onClick')).toBeDefined();
		expect(getByText('new function reference')).toBeDefined();
	});

	it('renders added entry with + prefix and value', () => {
		const report = makeReport({
			props: {
				changed: [{ key: 'label', kind: 'added', next: 'hello' }],
				unstable: [],
			},
		});
		const { getByText } = render(<PropDiffTable report={report} />);
		expect(getByText('+ label')).toBeDefined();
		expect(getByText('"hello"')).toBeDefined();
	});

	it('renders removed entry with − prefix and prev value', () => {
		const report = makeReport({
			props: {
				changed: [{ key: 'label', kind: 'removed', prev: 'bye' }],
				unstable: [],
			},
		});
		const { getByText } = render(<PropDiffTable report={report} />);
		expect(getByText('− label')).toBeDefined();
		expect(getByText('"bye"')).toBeDefined();
	});

	it('renders unstable props section with prop name and type', () => {
		const report = makeReport({
			props: {
				changed: [],
				unstable: [{ name: 'onClick', type: 'function' }],
			},
		});
		const { getByText } = render(<PropDiffTable report={report} />);
		expect(getByText('onClick')).toBeDefined();
		expect(getByText('function')).toBeDefined();
	});

	it('renders both changed and unstable sections when both present', () => {
		const report = makeReport({
			props: {
				changed: [{ key: 'title', kind: 'value-changed', prev: 'a', next: 'b' }],
				unstable: [{ name: 'fn', type: 'function' }],
			},
		});
		const { getByText } = render(<PropDiffTable report={report} />);
		expect(getByText('Changed Props')).toBeDefined();
		expect(getByText('Unstable Props')).toBeDefined();
	});
});
