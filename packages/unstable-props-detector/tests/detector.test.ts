import { describe, expect, it } from 'vitest';
import { detectUnstableProps } from '../src/detector/detector';

describe('detectUnstableProps', () => {
	describe('function props', () => {
		it('flags a function prop when reference changes', () => {
			const f1 = () => {};
			const f2 = () => {};
			const result = detectUnstableProps({ fn: f1 }, { fn: f2 }, []);
			expect(result).toEqual([{ name: 'fn', type: 'function' }]);
		});

		it('does not flag a function prop when reference is stable', () => {
			const fn = () => {};
			expect(detectUnstableProps({ fn }, { fn }, [])).toEqual([]);
		});
	});

	describe('array props', () => {
		it('flags an array prop when reference changes', () => {
			const result = detectUnstableProps({ ids: [1] }, { ids: [1] }, []);
			expect(result).toEqual([{ name: 'ids', type: 'array' }]);
		});

		it('does not flag an array prop when reference is stable', () => {
			const arr = [1, 2, 3];
			expect(detectUnstableProps({ arr }, { arr }, [])).toEqual([]);
		});

		it('classifies arrays as array, not object', () => {
			const result = detectUnstableProps({ v: [1] }, { v: [2] }, []);
			expect(result[0]?.type).toBe('array');
		});
	});

	describe('object props', () => {
		it('flags an object prop when reference changes', () => {
			const result = detectUnstableProps({ cfg: { a: 1 } }, { cfg: { a: 1 } }, []);
			expect(result).toEqual([{ name: 'cfg', type: 'object' }]);
		});

		it('does not flag an object prop when reference is stable', () => {
			const obj = { a: 1 };
			expect(detectUnstableProps({ obj }, { obj }, [])).toEqual([]);
		});
	});

	describe('primitive props', () => {
		it('does not flag a number primitive change', () => {
			expect(detectUnstableProps({ n: 1 }, { n: 2 }, [])).toEqual([]);
		});

		it('does not flag a string primitive change', () => {
			expect(detectUnstableProps({ s: 'a' }, { s: 'b' }, [])).toEqual([]);
		});

		it('does not flag a boolean primitive change', () => {
			expect(detectUnstableProps({ b: true }, { b: false }, [])).toEqual([]);
		});
	});

	describe('null / undefined', () => {
		it('does not classify null as object', () => {
			expect(detectUnstableProps({ v: { a: 1 } }, { v: null }, [])).toEqual([]);
		});

		it('does not classify undefined', () => {
			expect(detectUnstableProps({ v: { a: 1 } }, { v: undefined }, [])).toEqual([]);
		});

		it('does not flag prop that transitions from null to null', () => {
			expect(detectUnstableProps({ v: null }, { v: null }, [])).toEqual([]);
		});
	});

	describe('Object.is semantics', () => {
		it('does not flag NaN prop that stays NaN', () => {
			expect(detectUnstableProps({ n: NaN }, { n: NaN }, [])).toEqual([]);
		});

		it('does not flag stable +0 / -0 — Object.is distinguishes them but neither is a reference type', () => {
			// +0 and -0 are primitives; classified as nothing regardless of Object.is result
			expect(detectUnstableProps({ n: +0 }, { n: -0 }, [])).toEqual([]);
		});
	});

	describe('ignoreProps', () => {
		it('ignores a specified key before comparison', () => {
			const f1 = () => {};
			const f2 = () => {};
			expect(detectUnstableProps({ fn: f1 }, { fn: f2 }, ['fn'])).toEqual([]);
		});

		it('ignores only the listed keys, reports others', () => {
			const f1 = () => {};
			const f2 = () => {};
			const result = detectUnstableProps({ fn: f1, cb: f1 }, { fn: f2, cb: f2 }, ['fn']);
			expect(result).toEqual([{ name: 'cb', type: 'function' }]);
		});

		it('ignores a key even if the value is stable', () => {
			const fn = () => {};
			expect(detectUnstableProps({ fn }, { fn }, ['fn'])).toEqual([]);
		});
	});

	describe('removed props', () => {
		it('does not report a prop present in prev but absent in curr', () => {
			const fn = () => {};
			expect(detectUnstableProps({ fn, x: 1 }, { x: 1 }, [])).toEqual([]);
		});
	});

	describe('multiple unstable props', () => {
		it('returns one entry per unstable reference-type prop', () => {
			const result = detectUnstableProps({ fn: () => {}, obj: { a: 1 }, ids: [1] }, { fn: () => {}, obj: { a: 1 }, ids: [1] }, []);
			expect(result).toHaveLength(3);
			expect(result.map((r) => r.type).sort()).toEqual(['array', 'function', 'object']);
		});
	});

	describe('empty / edge cases', () => {
		it('returns empty array when prev and curr are identical', () => {
			const props = { a: 1, b: 'x' };
			expect(detectUnstableProps(props, props, [])).toEqual([]);
		});

		it('returns empty array when curr is empty', () => {
			expect(detectUnstableProps({ fn: () => {} }, {}, [])).toEqual([]);
		});

		it('returns empty array when prev is empty and curr has only primitives', () => {
			expect(detectUnstableProps({}, { n: 1, s: 'hi' }, [])).toEqual([]);
		});

		it('flags newly added reference-type prop (absent in prev, present in curr)', () => {
			// prev[key] is undefined; curr[key] is a function — Object.is(undefined, fn) is false
			const fn = () => {};
			const result = detectUnstableProps({}, { fn }, []);
			expect(result).toEqual([{ name: 'fn', type: 'function' }]);
		});
	});
});
