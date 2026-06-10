import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RenderTimeline } from '../../src/components/render-timeline.js';
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

describe('RenderTimeline', () => {
	it('renders a list element', () => {
		render(<RenderTimeline reports={[makeReport()]} maxVisible={10} />);
		expect(screen.getByRole('list')).toBeTruthy();
	});

	it('renders one list item per report', () => {
		const reports = [makeReport({ renderNumber: 1 }), makeReport({ renderNumber: 2 })];
		render(<RenderTimeline reports={reports} maxVisible={10} />);
		expect(screen.getAllByRole('listitem')).toHaveLength(2);
	});

	it('respects maxVisible — only shows latest N reports', () => {
		const reports = Array.from({ length: 10 }, (_, i) => makeReport({ renderNumber: i + 1 }));
		render(<RenderTimeline reports={reports} maxVisible={5} />);
		expect(screen.getAllByRole('listitem')).toHaveLength(5);
	});

	it('renders empty list for empty reports', () => {
		render(<RenderTimeline reports={[]} maxVisible={10} />);
		const list = screen.getByRole('list');
		expect(list.children).toHaveLength(0);
	});

	it('each pill has an aria-label', () => {
		const reports = [makeReport({ renderNumber: 1 }), makeReport({ renderNumber: 2 })];
		render(<RenderTimeline reports={reports} maxVisible={10} />);
		const items = screen.getAllByRole('listitem');
		items.forEach((item) => {
			expect(item.getAttribute('aria-label')).toBeTruthy();
		});
	});

	it('latest report pill is last in list', () => {
		const reports = [makeReport({ renderNumber: 1 }), makeReport({ renderNumber: 3 })];
		render(<RenderTimeline reports={reports} maxVisible={10} />);
		const items = screen.getAllByRole('listitem');
		expect(items[items.length - 1].getAttribute('aria-label')).toMatch(/3/);
	});
});
