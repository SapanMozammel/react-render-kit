import { describe, expect, it } from 'vitest';
import { diffProps } from '../src/diff/diff-props';

describe('diffProps', () => {
	it('returns no changes for identical primitive props', () => {
		expect(diffProps({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toEqual([]);
	});

	it('detects a string value change', () => {
		expect(diffProps({ name: 'Alice' }, { name: 'Bob' })).toEqual([{ kind: 'value-changed', key: 'name', prev: 'Alice', next: 'Bob' }]);
	});

	it('detects a number value change', () => {
		expect(diffProps({ age: 30 }, { age: 31 })).toEqual([{ kind: 'value-changed', key: 'age', prev: 30, next: 31 }]);
	});

	it('detects an object reference change', () => {
		expect(diffProps({ user: { id: 1 } }, { user: { id: 1 } })).toEqual([{ kind: 'reference-changed', key: 'user', refType: 'object' }]);
	});

	it('detects a function reference change', () => {
		const a = () => {};
		const b = () => {};
		expect(diffProps({ onClick: a }, { onClick: b })).toEqual([{ kind: 'reference-changed', key: 'onClick', refType: 'function' }]);
	});

	it('treats null as a primitive value, not an object reference', () => {
		const result = diffProps({ a: { id: 1 } }, { a: null });
		expect(result[0]).toMatchObject({ kind: 'value-changed', key: 'a' });
	});

	it('treats NaN as unchanged via Object.is', () => {
		expect(diffProps({ a: NaN }, { a: NaN })).toEqual([]);
	});

	it('treats +0 and -0 as different via Object.is', () => {
		const result = diffProps({ a: +0 }, { a: -0 });
		expect(result[0]).toMatchObject({ kind: 'value-changed', key: 'a' });
	});

	it('detects an added prop', () => {
		const result = diffProps({ a: 1 }, { a: 1, b: 2 });
		expect(result).toEqual([{ kind: 'added', key: 'b', next: 2 }]);
	});

	it('detects a removed prop', () => {
		const result = diffProps({ a: 1, b: 2 }, { a: 1 });
		expect(result).toEqual([{ kind: 'removed', key: 'b', prev: 2 }]);
	});

	it('detects an array reference change', () => {
		expect(diffProps({ items: [1, 2] }, { items: [1, 2] })).toEqual([{ kind: 'reference-changed', key: 'items', refType: 'object' }]);
	});

	it('stable array reference is unchanged', () => {
		const items = [1, 2];
		expect(diffProps({ items }, { items })).toEqual([]);
	});
});
