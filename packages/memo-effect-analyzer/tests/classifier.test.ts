import { describe, expect, it } from 'vitest';
import { classifyRender, classifySession } from '../src/classifier/classifier';
import type { RenderSignal } from '../src/types/index';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeSignal = (kind: RenderSignal['kind']): RenderSignal => ({
	kind,
	genuineKeys: kind !== 'reference-only' ? ['k'] : [],
	unstableProps: kind !== 'genuine' ? [{ name: 'k', type: 'object' }] : [],
});

// ── classifyRender ────────────────────────────────────────────────────────────

describe('classifyRender — null return', () => {
	it('returns null when prev and curr are the same reference', () => {
		const props = { a: 1 };
		expect(classifyRender(props, props, [])).toBeNull();
	});

	it('returns null when all changed keys are in ignoreProps', () => {
		expect(classifyRender({ fn: () => {} }, { fn: () => {} }, ['fn'])).toBeNull();
	});

	it('returns null when all Object.is comparisons are true', () => {
		const fn = () => {};
		expect(classifyRender({ fn, n: 1 }, { fn, n: 1 }, [])).toBeNull();
	});

	it('returns null for NaN → NaN (Object.is(NaN, NaN) === true)', () => {
		expect(classifyRender({ n: NaN }, { n: NaN }, [])).toBeNull();
	});

	it('returns null for +0 → +0', () => {
		expect(classifyRender({ n: +0 }, { n: +0 }, [])).toBeNull();
	});

	it('returns null for -0 → -0', () => {
		expect(classifyRender({ n: -0 }, { n: -0 }, [])).toBeNull();
	});
});

describe('classifyRender — genuine signal (GENUINE_SIDE only)', () => {
	it('string changed', () => {
		const result = classifyRender({ name: 'Alice' }, { name: 'Bob' }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['name']);
		expect(result?.unstableProps).toEqual([]);
	});

	it('number changed', () => {
		const result = classifyRender({ count: 1 }, { count: 2 }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['count']);
		expect(result?.unstableProps).toEqual([]);
	});

	it('boolean changed', () => {
		const result = classifyRender({ open: false }, { open: true }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['open']);
		expect(result?.unstableProps).toEqual([]);
	});

	it('+0 → -0 (Object.is returns false)', () => {
		const result = classifyRender({ n: +0 }, { n: -0 }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['n']);
	});

	it('-0 → +0 (Object.is returns false)', () => {
		const result = classifyRender({ n: -0 }, { n: +0 }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['n']);
	});

	it('key added — value is string', () => {
		const result = classifyRender({}, { label: 'x' }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['label']);
		expect(result?.unstableProps).toEqual([]);
	});

	it('key added — value is function', () => {
		const result = classifyRender({}, { fn: () => {} }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['fn']);
		expect(result?.unstableProps).toEqual([]);
	});

	it('key added — value is object', () => {
		const result = classifyRender({}, { cfg: {} }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['cfg']);
		expect(result?.unstableProps).toEqual([]);
	});

	it('key removed — value was string', () => {
		const result = classifyRender({ label: 'x' }, {}, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['label']);
		expect(result?.unstableProps).toEqual([]);
	});

	it('key removed — value was function', () => {
		const result = classifyRender({ fn: () => {} }, {}, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['fn']);
		expect(result?.unstableProps).toEqual([]);
	});

	it('object → null (both present; curr is null)', () => {
		const result = classifyRender({ cfg: {} }, { cfg: null }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['cfg']);
		expect(result?.unstableProps).toEqual([]);
	});

	it('function → null (both present; curr is null)', () => {
		const result = classifyRender({ fn: () => {} }, { fn: null }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['fn']);
		expect(result?.unstableProps).toEqual([]);
	});

	it('function → undefined (curr has key with undefined value)', () => {
		const result = classifyRender({ fn: () => {} }, { fn: undefined }, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['fn']);
	});

	it('any value → undefined via key removal (absent in curr)', () => {
		const result = classifyRender({ x: 'hello' }, {}, []);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['x']);
	});
});

describe('classifyRender — reference-only signal (REFERENCE_SIDE only)', () => {
	it('function reference changed', () => {
		const result = classifyRender({ fn: () => {} }, { fn: () => {} }, []);
		expect(result?.kind).toBe('reference-only');
		expect(result?.genuineKeys).toEqual([]);
		expect(result?.unstableProps).toEqual([{ name: 'fn', type: 'function' }]);
	});

	it('object reference changed', () => {
		const result = classifyRender({ cfg: {} }, { cfg: {} }, []);
		expect(result?.kind).toBe('reference-only');
		expect(result?.unstableProps).toEqual([{ name: 'cfg', type: 'object' }]);
	});

	it('array reference changed', () => {
		const result = classifyRender({ items: [1] }, { items: [1] }, []);
		expect(result?.kind).toBe('reference-only');
		expect(result?.unstableProps).toEqual([{ name: 'items', type: 'array' }]);
	});

	it('Map reference changed — type is object', () => {
		const result = classifyRender({ m: new Map() }, { m: new Map() }, []);
		expect(result?.kind).toBe('reference-only');
		expect(result?.unstableProps).toEqual([{ name: 'm', type: 'object' }]);
	});

	it('Set reference changed — type is object', () => {
		const result = classifyRender({ s: new Set() }, { s: new Set() }, []);
		expect(result?.kind).toBe('reference-only');
		expect(result?.unstableProps).toEqual([{ name: 's', type: 'object' }]);
	});

	it('null → function (both present; curr is function)', () => {
		const result = classifyRender({ fn: null }, { fn: () => {} }, []);
		expect(result?.kind).toBe('reference-only');
		expect(result?.unstableProps).toEqual([{ name: 'fn', type: 'function' }]);
	});

	it('null → object (both present; curr is object)', () => {
		const result = classifyRender({ cfg: null }, { cfg: {} }, []);
		expect(result?.kind).toBe('reference-only');
		expect(result?.unstableProps).toEqual([{ name: 'cfg', type: 'object' }]);
	});

	it('undefined → function (key existed in prev with undefined; curr is function)', () => {
		const result = classifyRender({ fn: undefined }, { fn: () => {} }, []);
		expect(result?.kind).toBe('reference-only');
		expect(result?.unstableProps).toEqual([{ name: 'fn', type: 'function' }]);
	});

	it('multiple reference props all changed — all REFERENCE_SIDE', () => {
		const result = classifyRender({ fn: () => {}, cfg: {} }, { fn: () => {}, cfg: {} }, []);
		expect(result?.kind).toBe('reference-only');
		expect(result?.unstableProps).toHaveLength(2);
		expect(result?.unstableProps.map((p) => p.name).sort()).toEqual(['cfg', 'fn']);
	});

	it('array type priority over object: [1,2,3] → [1,2,3] new array → type: array', () => {
		const result = classifyRender({ items: [1, 2, 3] }, { items: [1, 2, 3] }, []);
		expect(result?.unstableProps).toEqual([{ name: 'items', type: 'array' }]);
	});
});

describe('classifyRender — mixed signal (BOTH sides in same render)', () => {
	it('primitive changed + function reference changed', () => {
		const result = classifyRender({ count: 1, fn: () => {} }, { count: 2, fn: () => {} }, []);
		expect(result?.kind).toBe('mixed');
		expect(result?.genuineKeys).toEqual(['count']);
		expect(result?.unstableProps).toEqual([{ name: 'fn', type: 'function' }]);
	});

	it('key added + object reference changed', () => {
		const result = classifyRender({ cfg: {} }, { cfg: {}, label: 'x' }, []);
		expect(result?.kind).toBe('mixed');
		expect(result?.genuineKeys).toEqual(['label']);
		expect(result?.unstableProps).toEqual([{ name: 'cfg', type: 'object' }]);
	});

	it('key removed + function reference changed', () => {
		const result = classifyRender({ label: 'x', fn: () => {} }, { fn: () => {} }, []);
		expect(result?.kind).toBe('mixed');
		expect(result?.genuineKeys).toEqual(['label']);
		expect(result?.unstableProps).toEqual([{ name: 'fn', type: 'function' }]);
	});

	it('null→string (genuine) + function new ref (reference)', () => {
		const result = classifyRender({ status: null, fn: () => {} }, { status: 'active', fn: () => {} }, []);
		expect(result?.kind).toBe('mixed');
		expect(result?.genuineKeys).toEqual(['status']);
		expect(result?.unstableProps).toEqual([{ name: 'fn', type: 'function' }]);
	});
});

describe('classifyRender — ignoreProps filtering', () => {
	it('returns null when the only changed key is in ignoreProps', () => {
		expect(classifyRender({ fn: () => {} }, { fn: () => {} }, ['fn'])).toBeNull();
	});

	it('ignored reference key + non-ignored reference key → reference-only with only non-ignored key', () => {
		const result = classifyRender({ onClick: () => {}, onHover: () => {} }, { onClick: () => {}, onHover: () => {} }, ['onClick']);
		expect(result?.kind).toBe('reference-only');
		expect(result?.unstableProps).toEqual([{ name: 'onHover', type: 'function' }]);
	});

	it('ignored reference key + non-ignored primitive key → genuine', () => {
		const result = classifyRender({ fn: () => {}, count: 1 }, { fn: () => {}, count: 2 }, ['fn']);
		expect(result?.kind).toBe('genuine');
		expect(result?.genuineKeys).toEqual(['count']);
	});

	it('returns null when all changed keys are ignored', () => {
		const result = classifyRender({ a: () => {}, b: {} }, { a: () => {}, b: {} }, ['a', 'b']);
		expect(result).toBeNull();
	});
});

// ── classifySession ───────────────────────────────────────────────────────────

describe('classifySession — all K(W) permutations', () => {
	it('empty window → NOT_APPLICABLE', () => {
		expect(classifySession([])).toBe('NOT_APPLICABLE');
	});

	it('[genuine] → EFFECTIVE', () => {
		expect(classifySession([makeSignal('genuine')])).toBe('EFFECTIVE');
	});

	it('[genuine, genuine] → EFFECTIVE', () => {
		expect(classifySession([makeSignal('genuine'), makeSignal('genuine')])).toBe('EFFECTIVE');
	});

	it('[reference-only] → INEFFECTIVE', () => {
		expect(classifySession([makeSignal('reference-only')])).toBe('INEFFECTIVE');
	});

	it('[reference-only, reference-only] → INEFFECTIVE', () => {
		expect(classifySession([makeSignal('reference-only'), makeSignal('reference-only')])).toBe('INEFFECTIVE');
	});

	it('[mixed] → PARTIALLY_EFFECTIVE', () => {
		expect(classifySession([makeSignal('mixed')])).toBe('PARTIALLY_EFFECTIVE');
	});

	it('[mixed, mixed] → PARTIALLY_EFFECTIVE', () => {
		expect(classifySession([makeSignal('mixed'), makeSignal('mixed')])).toBe('PARTIALLY_EFFECTIVE');
	});

	it('[genuine, reference-only] → PARTIALLY_EFFECTIVE', () => {
		expect(classifySession([makeSignal('genuine'), makeSignal('reference-only')])).toBe('PARTIALLY_EFFECTIVE');
	});

	it('[genuine, mixed] → PARTIALLY_EFFECTIVE', () => {
		expect(classifySession([makeSignal('genuine'), makeSignal('mixed')])).toBe('PARTIALLY_EFFECTIVE');
	});

	it('[reference-only, mixed] → PARTIALLY_EFFECTIVE', () => {
		expect(classifySession([makeSignal('reference-only'), makeSignal('mixed')])).toBe('PARTIALLY_EFFECTIVE');
	});

	it('[genuine, reference-only, mixed] → PARTIALLY_EFFECTIVE', () => {
		expect(classifySession([makeSignal('genuine'), makeSignal('reference-only'), makeSignal('mixed')])).toBe('PARTIALLY_EFFECTIVE');
	});
});

describe('classifySession — FIFO window eviction', () => {
	const ro = makeSignal('reference-only');
	const g = makeSignal('genuine');

	it('20 reference-only signals → INEFFECTIVE', () => {
		const window = Array.from({ length: 20 }, () => ro);
		expect(classifySession(window)).toBe('INEFFECTIVE');
	});

	it('window [ro×19, g×1] → PARTIALLY_EFFECTIVE', () => {
		const window = [...Array.from({ length: 19 }, () => ro), g];
		expect(classifySession(window)).toBe('PARTIALLY_EFFECTIVE');
	});

	it('window [ro×1, g×19] → PARTIALLY_EFFECTIVE', () => {
		const window = [ro, ...Array.from({ length: 19 }, () => g)];
		expect(classifySession(window)).toBe('PARTIALLY_EFFECTIVE');
	});

	it('window [g×20] → EFFECTIVE', () => {
		const window = Array.from({ length: 20 }, () => g);
		expect(classifySession(window)).toBe('EFFECTIVE');
	});

	it('window never exceeds 20 after 21 pushes (INV8 — simulated)', () => {
		const window: RenderSignal[] = [];
		for (let i = 0; i < 21; i++) {
			if (window.length === 20) window.shift();
			window.push(ro);
		}
		expect(window.length).toBe(20);
	});
});
