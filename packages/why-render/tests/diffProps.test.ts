import { describe, expect, it } from 'vitest';
import { diffProps } from '../src/diff/diffProps';

describe('diffProps', () => {
	it('returns no changes for identical primitive props', () => {
		const result = diffProps({ a: 1, b: 'x' }, { a: 1, b: 'x' });
		expect(result.changes).toEqual([]);
		expect(result.unchanged).toEqual(['a', 'b']);
	});

	it('detects a string value change', () => {
		const result = diffProps({ name: 'Alice' }, { name: 'Bob' });
		expect(result.changes).toEqual([{ kind: 'value-changed', key: 'name', prev: 'Alice', next: 'Bob' }]);
	});

	it('detects a number value change', () => {
		const result = diffProps({ age: 30 }, { age: 31 });
		expect(result.changes).toEqual([{ kind: 'value-changed', key: 'age', prev: 30, next: 31 }]);
	});

	it('detects an object reference change', () => {
		const result = diffProps({ user: { id: 1 } }, { user: { id: 1 } });
		expect(result.changes).toEqual([{ kind: 'reference-changed', key: 'user', refType: 'object' }]);
	});

	it('detects a function reference change', () => {
		const a = () => {};
		const b = () => {};
		const result = diffProps({ onClick: a }, { onClick: b });
		expect(result.changes).toEqual([{ kind: 'reference-changed', key: 'onClick', refType: 'function' }]);
	});

	it('treats null as a primitive value, not an object reference', () => {
		const result = diffProps({ a: { id: 1 } }, { a: null });
		expect(result.changes[0]).toMatchObject({ kind: 'value-changed', key: 'a' });
	});

	it('treats NaN as unchanged via Object.is', () => {
		const result = diffProps({ a: NaN }, { a: NaN });
		expect(result.changes).toEqual([]);
		expect(result.unchanged).toEqual(['a']);
	});

	it('treats +0 and -0 as different via Object.is', () => {
		const result = diffProps({ a: +0 }, { a: -0 });
		expect(result.changes[0]).toMatchObject({ kind: 'value-changed', key: 'a' });
	});

	it('detects an added prop', () => {
		const result = diffProps({ a: 1 }, { a: 1, b: 2 });
		expect(result.changes).toEqual([{ kind: 'added', key: 'b', next: 2 }]);
		expect(result.unchanged).toEqual(['a']);
	});

	it('detects a removed prop', () => {
		const result = diffProps({ a: 1, b: 2 }, { a: 1 });
		expect(result.changes).toEqual([{ kind: 'removed', key: 'b', prev: 2 }]);
		expect(result.unchanged).toEqual(['a']);
	});

	it('detects an array reference change', () => {
		const result = diffProps({ items: [1, 2] }, { items: [1, 2] });
		expect(result.changes).toEqual([{ kind: 'reference-changed', key: 'items', refType: 'object' }]);
	});

	it('stable array reference is unchanged', () => {
		const items = [1, 2];
		const result = diffProps({ items }, { items });
		expect(result.changes).toEqual([]);
		expect(result.unchanged).toEqual(['items']);
	});
});
