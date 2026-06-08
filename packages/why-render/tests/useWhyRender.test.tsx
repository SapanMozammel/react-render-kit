import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWhyRender } from '../src/hook/useWhyRender';

describe('useWhyRender', () => {
	beforeEach(() => {
		vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not log on first render', () => {
		renderHook(() => useWhyRender('MyComponent', { name: 'Alice' }));
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});

	it('does not log when props are unchanged', () => {
		const { rerender } = renderHook(({ name }) => useWhyRender('MyComponent', { name }), {
			initialProps: { name: 'Alice' },
		});
		rerender({ name: 'Alice' });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});

	it('logs when a primitive prop changes', () => {
		const { rerender } = renderHook(({ name }) => useWhyRender('MyComponent', { name }), {
			initialProps: { name: 'Alice' },
		});
		rerender({ name: 'Bob' });
		expect(console.groupCollapsed).toHaveBeenCalledWith('[why-render] <MyComponent>');
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Primitive Changes'));
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Alice'));
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Bob'));
	});

	it('logs reference-changed for object props', () => {
		const { rerender } = renderHook(({ user }) => useWhyRender('UserCard', { user }), {
			initialProps: { user: { id: 1 } },
		});
		rerender({ user: { id: 1 } });
		expect(console.groupCollapsed).toHaveBeenCalledWith('[why-render] <UserCard>');
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Reference Changes'));
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('object reference changed'));
	});

	it('logs reference-changed for function props', () => {
		const { rerender } = renderHook(({ onClick }) => useWhyRender('Button', { onClick }), {
			initialProps: { onClick: () => {} },
		});
		rerender({ onClick: () => {} });
		expect(console.groupCollapsed).toHaveBeenCalledWith('[why-render] <Button>');
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('function reference changed'));
	});

	it('logs added props', () => {
		type Props = { a: number; loading?: boolean };
		const { rerender } = renderHook(({ a, loading }: Props) => useWhyRender('Comp', { a, ...(loading !== undefined && { loading }) }), {
			initialProps: { a: 1 } as Props,
		});
		rerender({ a: 1, loading: true });
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Added Props'));
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('loading'));
	});

	it('logs removed props', () => {
		type Props = { a: number; b?: number };
		const { rerender } = renderHook(({ a, b }: Props) => useWhyRender('Comp', { a, ...(b !== undefined && { b }) }), {
			initialProps: { a: 1, b: 2 } as Props,
		});
		rerender({ a: 1 });
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed Props'));
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('b'));
	});

	it('does not log when options.enabled is false', () => {
		const { rerender } = renderHook(({ name }) => useWhyRender('MyComponent', { name }, { enabled: false }), {
			initialProps: { name: 'Alice' },
		});
		rerender({ name: 'Bob' });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});

	it('resumes logging when options.enabled switches from false to true', () => {
		type Props = { name: string; enabled: boolean };
		const { rerender } = renderHook(
			({ name, enabled }: Props) => useWhyRender('MyComponent', { name }, { enabled }),
			{ initialProps: { name: 'Alice', enabled: true } },
		);
		rerender({ name: 'Bob', enabled: false });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
		rerender({ name: 'Charlie', enabled: true });
		expect(console.groupCollapsed).toHaveBeenCalledWith('[why-render] <MyComponent>');
	});

	it('tracks the correct component name in the log header', () => {
		const { rerender } = renderHook(({ age }) => useWhyRender('ProfileCard', { age }), {
			initialProps: { age: 30 },
		});
		rerender({ age: 31 });
		expect(console.groupCollapsed).toHaveBeenCalledWith('[why-render] <ProfileCard>');
	});

	it('does not log when only the stable reference is re-used', () => {
		const user = { id: 1 };
		const { rerender } = renderHook(({ u }) => useWhyRender('MyComponent', { user: u }), {
			initialProps: { u: user },
		});
		rerender({ u: user });
		expect(console.groupCollapsed).not.toHaveBeenCalled();
	});
});
