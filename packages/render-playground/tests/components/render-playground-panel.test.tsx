import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RenderPlaygroundPanel } from '../../src/components/render-playground-panel.js';
import { PlaygroundContext } from '../../src/context/playground-context.js';
import { createPlaygroundStore } from '../../src/store/playground-store.js';
import type { InsightReport } from '@sapanmozammel/render-insights';
import type { PlaygroundStore } from '../../src/types/index.js';

const makeReport = (overrides?: Partial<InsightReport>): InsightReport => ({
	componentName: 'MyComp',
	renderNumber: 1,
	reportNumber: 1,
	props: { changed: [], unstable: [] },
	frequency: { totalRenders: 1, windowCount: 1, windowMs: 1000, rate: 1, classification: 'LOW' },
	memo: { signalKind: null, sessionClass: 'NOT_APPLICABLE', genuineCount: 0, referenceOnlyCount: 0, mixedCount: 0 },
	score: 95,
	grade: 'EXCELLENT',
	inferredTrigger: 'no-prop-change',
	recommendations: [],
	...overrides,
});

const renderWithStore = (store: PlaygroundStore, props?: Parameters<typeof RenderPlaygroundPanel>[0]) =>
	render(
		<PlaygroundContext.Provider value={store}>
			<RenderPlaygroundPanel {...props} />
		</PlaygroundContext.Provider>
	);

describe('RenderPlaygroundPanel', () => {
	it('renders the panel region', () => {
		const store = createPlaygroundStore();
		renderWithStore(store);
		expect(screen.getByRole('region')).toBeTruthy();
	});

	it('aria-label contains component name after first report', () => {
		const store = createPlaygroundStore();
		store.push(makeReport({ componentName: 'MyComp' }));
		renderWithStore(store);
		expect(screen.getByRole('region').getAttribute('aria-label')).toMatch(/MyComp/);
	});

	it('shows empty state when no reports', () => {
		const store = createPlaygroundStore();
		renderWithStore(store);
		expect(screen.getByText(/Trigger a render/i)).toBeTruthy();
	});

	it('shows render number after report is pushed', () => {
		const store = createPlaygroundStore();
		store.push(makeReport({ renderNumber: 3 }));
		renderWithStore(store);
		expect(screen.getAllByText(/#3/).length).toBeGreaterThan(0);
	});

	it('clear button has correct aria-label', () => {
		const store = createPlaygroundStore();
		renderWithStore(store);
		expect(screen.getByRole('button', { name: /clear render history/i })).toBeTruthy();
	});

	it('clear button calls store.clear() and onClear callback', () => {
		const store = createPlaygroundStore();
		store.push(makeReport());
		const onClear = vi.fn();
		const clearSpy = vi.spyOn(store, 'clear');
		renderWithStore(store, { onClear });
		fireEvent.click(screen.getByRole('button', { name: /clear render history/i }));
		expect(clearSpy).toHaveBeenCalledTimes(1);
		expect(onClear).toHaveBeenCalledTimes(1);
	});

	it('hides session strip when fewer than 3 reports', () => {
		const store = createPlaygroundStore();
		store.push(makeReport());
		store.push(makeReport({ renderNumber: 2 }));
		renderWithStore(store);
		// Session strip only renders when windowSize >= 3
		expect(screen.queryByText(/renders/)).toBeNull();
	});

	it('shows session strip when 3+ reports', () => {
		const store = createPlaygroundStore();
		for (let i = 1; i <= 3; i++) store.push(makeReport({ renderNumber: i }));
		renderWithStore(store);
		expect(screen.getByText(/3 renders/)).toBeTruthy();
	});

	it('renders without a PlaygroundContext provider (uses NOOP store)', () => {
		// Should not throw — uses NOOP store
		expect(() => render(<RenderPlaygroundPanel />)).not.toThrow();
	});

	it('returns null in production', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const store = createPlaygroundStore();
		const { container } = renderWithStore(store);
		expect(container.firstChild).toBeNull();
		vi.unstubAllEnvs();
	});

	it('renders score and grade after report', () => {
		const store = createPlaygroundStore();
		store.push(makeReport({ score: 95, grade: 'EXCELLENT' }));
		renderWithStore(store);
		expect(screen.getByText(/95 \/ 100/)).toBeTruthy();
	});

	it('shows component name in header', () => {
		const store = createPlaygroundStore();
		store.push(makeReport({ componentName: 'FancyCard' }));
		renderWithStore(store);
		expect(screen.getByText(/FancyCard/)).toBeTruthy();
	});

	it('shows R-CLEAR-001 recommendation for well-optimized report', () => {
		const store = createPlaygroundStore();
		store.push(makeReport({ score: 95 }));
		renderWithStore(store);
		// R-CLEAR-001 produces "Component is well-optimized" title
		expect(screen.queryByText(/well-optimized/i) ?? screen.queryByText(/well optimized/i)).toBeTruthy();
	});
});
