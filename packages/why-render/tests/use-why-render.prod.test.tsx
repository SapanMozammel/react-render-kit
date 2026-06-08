import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWhyRender } from '../src/hook/use-why-render';

vi.mock('../src/env', () => ({ isDev: false }));

describe('useWhyRender (production)', () => {
	beforeEach(() => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not log anything when isDev is false', () => {
		const { rerender } = renderHook(({ name }) => useWhyRender('MyComponent', { name }), {
			initialProps: { name: 'Alice' },
		});
		rerender({ name: 'Bob' });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});

	it('does not log on first render when isDev is false', () => {
		renderHook(() => useWhyRender('MyComponent', { a: 1 }));
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});
});
