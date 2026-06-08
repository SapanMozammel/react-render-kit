import { describe, expect, it } from 'vitest';
import { diffProps } from '../src/diff-props';

describe('diffProps', () => {
	it('returns empty changes when props are identical', () => {
		const result = diffProps({ a: 1, b: 'x' }, { a: 1, b: 'x' });
		expect(result.changes).toEqual([]);
		expect(result.unchanged).toEqual(['a', 'b']);
	});

	it('detects primitive value changes', () => {
		const result = diffProps({ a: 1 }, { a: 2 });
		expect(result.changes).toEqual([{ kind: 'value-changed', key: 'a', prev: 1, next: 2 }]);
	});

	it('detects reference changes for objects with equal shape', () => {
		const result = diffProps({ user: { id: 1 } }, { user: { id: 1 } });
		expect(result.changes).toHaveLength(1);
		expect(result.changes[0].kind).toBe('reference-changed');
		expect(result.changes[0].key).toBe('user');
	});

	it('detects reference changes for functions', () => {
		const result = diffProps({ onClick: () => {} }, { onClick: () => {} });
		expect(result.changes).toHaveLength(1);
		expect(result.changes[0].kind).toBe('reference-changed');
	});

	it('keeps unchanged stable object references in unchanged list', () => {
		const user = { id: 1 };
		const result = diffProps({ user }, { user });
		expect(result.changes).toEqual([]);
		expect(result.unchanged).toEqual(['user']);
	});

	it('detects added and removed props', () => {
		const result = diffProps({ a: 1 }, { b: 2 });
		expect(result.changes).toContainEqual({ kind: 'removed', key: 'a', prev: 1 });
		expect(result.changes).toContainEqual({ kind: 'added', key: 'b', next: 2 });
	});

	it('handles null and undefined values', () => {
		const result = diffProps({ a: null, b: undefined }, { a: undefined, b: null });
		expect(result.changes.map((c) => c.key).sort()).toEqual(['a', 'b']);
		for (const change of result.changes) {
			expect(change.kind).toBe('value-changed');
		}
	});

	it('treats NaN as equal via Object.is default', () => {
		const result = diffProps({ a: NaN }, { a: NaN });
		expect(result.changes).toEqual([]);
		expect(result.unchanged).toEqual(['a']);
	});

	it('supports a custom equality function', () => {
		const deepEqualByJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
		const result = diffProps({ user: { id: 1, name: 'Ada' } }, { user: { id: 1, name: 'Ada' } }, deepEqualByJson);
		expect(result.changes).toEqual([]);
		expect(result.unchanged).toEqual(['user']);
	});

	it('does not crash on empty inputs', () => {
		const result = diffProps({}, {});
		expect(result.changes).toEqual([]);
		expect(result.unchanged).toEqual([]);
	});
});
