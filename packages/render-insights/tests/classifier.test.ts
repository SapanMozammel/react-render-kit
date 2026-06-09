import { describe, expect, it } from 'vitest';
import { classifyFrequency } from '../src/classifier/classify-frequency.js';
import { classifyProps } from '../src/classifier/classify-props.js';
import { classifySession } from '../src/classifier/classify-session.js';
import { classifySignal } from '../src/classifier/classify-signal.js';
import type { RenderSignal } from '../src/types/index.js';

// ── classifyProps ──────────────────────────────────────────────────────────

describe('classifyProps', () => {
	it('returns empty when prev === curr (same reference)', () => {
		const obj = { a: 1 };
		expect(classifyProps(obj, obj, [])).toEqual({ changed: [], unstable: [] });
	});

	it('returns empty when all Object.is comparisons are true', () => {
		expect(classifyProps({ a: 1 }, { a: 1 }, [])).toEqual({ changed: [], unstable: [] });
	});

	it('returns empty when all changed keys are in ignoreProps', () => {
		expect(classifyProps({ a: 1 }, { a: 2 }, ['a'])).toEqual({ changed: [], unstable: [] });
	});

	it('detects string value-changed, not in unstable', () => {
		const result = classifyProps({ a: 'x' }, { a: 'y' }, []);
		expect(result.changed).toHaveLength(1);
		expect(result.changed[0]).toEqual({ kind: 'value-changed', key: 'a', prev: 'x', next: 'y' });
		expect(result.unstable).toHaveLength(0);
	});

	it('detects number value-changed', () => {
		const result = classifyProps({ n: 1 }, { n: 2 }, []);
		expect(result.changed[0]).toMatchObject({ kind: 'value-changed', key: 'n' });
		expect(result.unstable).toHaveLength(0);
	});

	it('detects boolean value-changed', () => {
		const result = classifyProps({ b: true }, { b: false }, []);
		expect(result.changed[0]).toMatchObject({ kind: 'value-changed', key: 'b' });
		expect(result.unstable).toHaveLength(0);
	});

	it('+0 → -0 is value-changed (Object.is returns false)', () => {
		const result = classifyProps({ n: +0 }, { n: -0 }, []);
		expect(result.changed[0]).toMatchObject({ kind: 'value-changed' });
	});

	it('detects function reference-changed, adds to unstable with type function', () => {
		const fn1 = () => {};
		const fn2 = () => {};
		const result = classifyProps({ fn: fn1 }, { fn: fn2 }, []);
		expect(result.changed[0]).toEqual({ kind: 'reference-changed', key: 'fn', refType: 'function' });
		expect(result.unstable[0]).toEqual({ name: 'fn', type: 'function' });
	});

	it('detects array reference-changed, adds to unstable with type array', () => {
		const result = classifyProps({ arr: [1] }, { arr: [1] }, []);
		expect(result.changed[0]).toMatchObject({ kind: 'reference-changed', key: 'arr', refType: 'array' });
		expect(result.unstable[0]).toEqual({ name: 'arr', type: 'array' });
	});

	it('detects object reference-changed, adds to unstable with type object', () => {
		const result = classifyProps({ obj: { x: 1 } }, { obj: { x: 1 } }, []);
		expect(result.changed[0]).toMatchObject({ kind: 'reference-changed', key: 'obj', refType: 'object' });
		expect(result.unstable[0]).toEqual({ name: 'obj', type: 'object' });
	});

	it('added primitive key: kind added, NOT in unstable', () => {
		const result = classifyProps({}, { a: 42 }, []);
		expect(result.changed[0]).toEqual({ kind: 'added', key: 'a', next: 42 });
		expect(result.unstable).toHaveLength(0);
	});

	it('added function key: kind added, NOT in unstable', () => {
		const fn = () => {};
		const result = classifyProps({}, { fn }, []);
		expect(result.changed[0]).toMatchObject({ kind: 'added', key: 'fn' });
		expect(result.unstable).toHaveLength(0);
	});

	it('added object key: kind added, NOT in unstable', () => {
		const result = classifyProps({}, { obj: { x: 1 } }, []);
		expect(result.changed[0]).toMatchObject({ kind: 'added', key: 'obj' });
		expect(result.unstable).toHaveLength(0);
	});

	it('removed key: kind removed, NOT in unstable', () => {
		const result = classifyProps({ a: 1 }, {}, []);
		expect(result.changed[0]).toEqual({ kind: 'removed', key: 'a', prev: 1 });
		expect(result.unstable).toHaveLength(0);
	});

	it('NaN → NaN: no change (Object.is(NaN, NaN) === true)', () => {
		expect(classifyProps({ n: NaN }, { n: NaN }, [])).toEqual({ changed: [], unstable: [] });
	});

	it('ignored key changed: not in output', () => {
		const result = classifyProps({ a: 1 }, { a: 2 }, ['a']);
		expect(result.changed).toHaveLength(0);
	});

	it('ignored reference key + non-ignored primitive key: only primitive in output', () => {
		const fn1 = () => {};
		const fn2 = () => {};
		const result = classifyProps({ fn: fn1, count: 1 }, { fn: fn2, count: 2 }, ['fn']);
		expect(result.changed).toHaveLength(1);
		expect(result.changed[0]).toMatchObject({ kind: 'value-changed', key: 'count' });
		expect(result.unstable).toHaveLength(0);
	});

	it('multiple unstable props: all in unstable, priority order correct (function > array > object)', () => {
		const result = classifyProps(
			{ fn: () => {}, arr: [1], obj: {} },
			{ fn: () => {}, arr: [1], obj: {} },
			[],
		);
		expect(result.unstable.map((p) => p.type)).toContain('function');
		expect(result.unstable.map((p) => p.type)).toContain('array');
		expect(result.unstable.map((p) => p.type)).toContain('object');
	});

	it('null object is NOT reference-changed (it is value-changed)', () => {
		const result = classifyProps({ x: null }, { x: null }, []);
		expect(result.changed).toHaveLength(0);
	});

	it('prev null → curr object: value-changed (null literal differs)', () => {
		const result = classifyProps({ x: null }, { x: {} }, []);
		// Object.is(null, {}) is false; curr[x] is object → reference-changed
		expect(result.changed[0]).toMatchObject({ kind: 'reference-changed' });
		expect(result.unstable[0]).toMatchObject({ type: 'object' });
	});

	it('multiple changed keys: all appear in output', () => {
		const fn1 = () => {};
		const fn2 = () => {};
		const result = classifyProps({ a: 1, fn: fn1 }, { a: 2, fn: fn2 }, []);
		expect(result.changed).toHaveLength(2);
		expect(result.unstable).toHaveLength(1);
	});

	it('unchanged key not included in changed', () => {
		const result = classifyProps({ a: 1, b: 2 }, { a: 1, b: 3 }, []);
		expect(result.changed).toHaveLength(1);
		expect(result.changed[0].key).toBe('b');
	});

	it('function priority over array: function is detected first', () => {
		// function should be classified as 'function', not 'array'
		const fn = () => {};
		const result = classifyProps({ fn: () => {} }, { fn }, []);
		expect(result.unstable[0]?.type).toBe('function');
	});

	it('array priority over object: array detected before object', () => {
		const result = classifyProps({ arr: [1, 2] }, { arr: [1, 2] }, []);
		expect(result.unstable[0]?.type).toBe('array');
	});

	it('Symbol keys are silently ignored (Object.keys does not include them)', () => {
		const sym = Symbol('test');
		const prev: Record<string, unknown> = {};
		const curr: Record<string, unknown> = {};
		(prev as Record<symbol, unknown>)[sym] = 1;
		(curr as Record<symbol, unknown>)[sym] = 2;
		expect(classifyProps(prev, curr, [])).toEqual({ changed: [], unstable: [] });
	});

	it('undefined value change: undefined → value is added, value → undefined is removed', () => {
		const result = classifyProps({ a: undefined }, { a: 42 }, []);
		expect(result.changed[0]).toMatchObject({ kind: 'value-changed', key: 'a' });
	});

	it('undefined → undefined: no change', () => {
		expect(classifyProps({ a: undefined }, { a: undefined }, [])).toEqual({ changed: [], unstable: [] });
	});

	it('both added and removed keys in same call', () => {
		const result = classifyProps({ a: 1 }, { b: 2 }, []);
		expect(result.changed.some((e) => e.kind === 'removed')).toBe(true);
		expect(result.changed.some((e) => e.kind === 'added')).toBe(true);
	});

	it('ignoreProps filters multiple keys', () => {
		const result = classifyProps({ a: 1, b: 2, c: 3 }, { a: 2, b: 3, c: 4 }, ['a', 'b']);
		expect(result.changed).toHaveLength(1);
		expect(result.changed[0].key).toBe('c');
	});

	it('empty prev and empty curr: no output', () => {
		expect(classifyProps({}, {}, [])).toEqual({ changed: [], unstable: [] });
	});

	it('new empty object reference is reference-changed', () => {
		const result = classifyProps({ config: {} }, { config: {} }, []);
		expect(result.changed[0]).toMatchObject({ kind: 'reference-changed', refType: 'object' });
	});

	it('NaN → number: value-changed (Object.is(NaN, 1) === false)', () => {
		const result = classifyProps({ n: NaN }, { n: 1 }, []);
		expect(result.changed[0]).toMatchObject({ kind: 'value-changed' });
	});

	it('same function reference: no change', () => {
		const fn = () => {};
		expect(classifyProps({ fn }, { fn }, [])).toEqual({ changed: [], unstable: [] });
	});

	it('same array reference: no change', () => {
		const arr = [1, 2, 3];
		expect(classifyProps({ arr }, { arr }, [])).toEqual({ changed: [], unstable: [] });
	});
});

// ── classifySignal ─────────────────────────────────────────────────────────

describe('classifySignal', () => {
	it('returns null when changed is empty', () => {
		expect(classifySignal({ changed: [], unstable: [] })).toBeNull();
	});

	it('returns kind genuine when all changes are value-changed', () => {
		const result = classifySignal({
			changed: [{ kind: 'value-changed', key: 'a', prev: 1, next: 2 }],
			unstable: [],
		});
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['a']);
	});

	it('returns kind genuine when all changes are added', () => {
		const result = classifySignal({
			changed: [{ kind: 'added', key: 'b', next: 42 }],
			unstable: [],
		});
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['b']);
	});

	it('returns kind genuine when all changes are removed', () => {
		const result = classifySignal({
			changed: [{ kind: 'removed', key: 'c', prev: 5 }],
			unstable: [],
		});
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['c']);
	});

	it('returns kind reference-only when all changes are reference-changed', () => {
		const unstable = [{ name: 'fn', type: 'function' as const }];
		const result = classifySignal({
			changed: [{ kind: 'reference-changed', key: 'fn', refType: 'function' }],
			unstable,
		});
		expect(result?.kind).toBe('reference-only');
		expect(result?.genuineKeys).toHaveLength(0);
		expect(result?.unstableProps).toEqual(unstable);
	});

	it('returns kind mixed when both genuine and reference sides present', () => {
		const unstable = [{ name: 'fn', type: 'function' as const }];
		const result = classifySignal({
			changed: [
				{ kind: 'value-changed', key: 'count', prev: 1, next: 2 },
				{ kind: 'reference-changed', key: 'fn', refType: 'function' },
			],
			unstable,
		});
		expect(result?.kind).toBe('mixed');
		expect(result?.genuineKeys).toEqual(['count']);
		expect(result?.unstableProps).toEqual(unstable);
	});

	it('unstableProps in signal matches PropChangeSummary.unstable', () => {
		const unstable = [{ name: 'obj', type: 'object' as const }];
		const result = classifySignal({
			changed: [{ kind: 'reference-changed', key: 'obj', refType: 'object' }],
			unstable,
		});
		expect(result?.unstableProps).toBe(unstable);
	});
});

// ── classifySession ────────────────────────────────────────────────────────

describe('classifySession', () => {
	const makeSignal = (kind: 'genuine' | 'reference-only' | 'mixed'): RenderSignal => ({ kind, genuineKeys: [], unstableProps: [] });

	it('returns NOT_APPLICABLE for empty window', () => {
		expect(classifySession([])).toBe('NOT_APPLICABLE');
	});

	it('returns EFFECTIVE for all genuine', () => {
		expect(classifySession([makeSignal('genuine'), makeSignal('genuine')])).toBe('EFFECTIVE');
	});

	it('returns INEFFECTIVE for all reference-only', () => {
		expect(classifySession([makeSignal('reference-only'), makeSignal('reference-only')])).toBe('INEFFECTIVE');
	});

	it('returns PARTIALLY_EFFECTIVE for genuine + reference-only', () => {
		expect(classifySession([makeSignal('genuine'), makeSignal('reference-only')])).toBe('PARTIALLY_EFFECTIVE');
	});

	it('returns PARTIALLY_EFFECTIVE for genuine + mixed', () => {
		expect(classifySession([makeSignal('genuine'), makeSignal('mixed')])).toBe('PARTIALLY_EFFECTIVE');
	});

	it('returns PARTIALLY_EFFECTIVE for reference-only + mixed', () => {
		expect(classifySession([makeSignal('reference-only'), makeSignal('mixed')])).toBe('PARTIALLY_EFFECTIVE');
	});

	it('returns PARTIALLY_EFFECTIVE when any mixed present', () => {
		expect(classifySession([makeSignal('genuine'), makeSignal('genuine'), makeSignal('mixed')])).toBe('PARTIALLY_EFFECTIVE');
	});

	it('EFFECTIVE for single genuine', () => {
		expect(classifySession([makeSignal('genuine')])).toBe('EFFECTIVE');
	});

	it('INEFFECTIVE for single reference-only', () => {
		expect(classifySession([makeSignal('reference-only')])).toBe('INEFFECTIVE');
	});

	it('PARTIALLY_EFFECTIVE for single mixed', () => {
		expect(classifySession([makeSignal('mixed')])).toBe('PARTIALLY_EFFECTIVE');
	});
});

// ── classifyFrequency ──────────────────────────────────────────────────────

describe('classifyFrequency', () => {
	it('returns NOT_ENOUGH_DATA when windowCount < 2', () => {
		expect(classifyFrequency(0, 10000)).toBe('NOT_ENOUGH_DATA');
		expect(classifyFrequency(1, 10000)).toBe('NOT_ENOUGH_DATA');
	});

	it('returns LOW when rate exactly 2.0', () => {
		// 2 renders in 1s window → rate = 2.0 → LOW (strictly > 2.0 needed for MODERATE)
		expect(classifyFrequency(2, 1000)).toBe('LOW');
	});

	it('returns LOW when rate = 1.0', () => {
		expect(classifyFrequency(10, 10000)).toBe('LOW');
	});

	it('returns MODERATE when rate = 2.1', () => {
		// 21 renders in 10s = 2.1/s
		expect(classifyFrequency(21, 10000)).toBe('MODERATE');
	});

	it('returns MODERATE when rate exactly 10.0', () => {
		// 10 renders in 1s = 10.0/s → MODERATE (strictly > 10.0 needed for HIGH)
		expect(classifyFrequency(10, 1000)).toBe('MODERATE');
	});

	it('returns HIGH when rate = 10.1', () => {
		// 101 renders in 10s = 10.1/s
		expect(classifyFrequency(101, 10000)).toBe('HIGH');
	});

	it('returns LOW when rate = 0.5', () => {
		expect(classifyFrequency(5, 10000)).toBe('LOW');
	});

	it('returns NOT_ENOUGH_DATA when windowCount = 2 but actually: 2 ≥ 2 so proceeds to rate', () => {
		// 2 renders in 10s = 0.2/s → LOW
		expect(classifyFrequency(2, 10000)).toBe('LOW');
	});

	it('boundary: windowCount exactly 0 → NOT_ENOUGH_DATA', () => {
		expect(classifyFrequency(0, 5000)).toBe('NOT_ENOUGH_DATA');
	});
});
