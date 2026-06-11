import { describe, it, expect } from 'vitest';
import { isSchemaVersion, isEventType, isHealthGrade, isFrequencyClass, isMemoClassification, isSignalKind, isRenderTrigger, isInferredTrigger } from '../src/utils/type-guards.js';

describe('isSchemaVersion', () => {
	it('accepts valid semver strings', () => {
		expect(isSchemaVersion('1.0.0')).toBe(true);
		expect(isSchemaVersion('10.20.300')).toBe(true);
		expect(isSchemaVersion('0.0.0')).toBe(true);
	});

	it('rejects malformed strings', () => {
		expect(isSchemaVersion('1.0')).toBe(false);
		expect(isSchemaVersion('1')).toBe(false);
		expect(isSchemaVersion('1.0.0.0')).toBe(false);
		expect(isSchemaVersion('v1.0.0')).toBe(false);
		expect(isSchemaVersion('1.0.a')).toBe(false);
		expect(isSchemaVersion('')).toBe(false);
	});

	it('rejects leading zeros (strict semver)', () => {
		expect(isSchemaVersion('01.0.0')).toBe(false);
		expect(isSchemaVersion('1.01.0')).toBe(false);
		expect(isSchemaVersion('1.0.01')).toBe(false);
	});

	it('rejects non-strings', () => {
		expect(isSchemaVersion(null)).toBe(false);
		expect(isSchemaVersion(undefined)).toBe(false);
		expect(isSchemaVersion(100)).toBe(false);
		expect(isSchemaVersion({})).toBe(false);
	});
});

describe('isEventType', () => {
	it('accepts all valid event types', () => {
		const types = ['session-start', 'render', 'prop-change', 'frequency', 'score', 'recommendation', 'session-end'];
		for (const t of types) {
			expect(isEventType(t)).toBe(true);
		}
	});

	it('rejects unknown strings', () => {
		expect(isEventType('render-event')).toBe(false);
		expect(isEventType('RENDER')).toBe(false);
		expect(isEventType('')).toBe(false);
	});

	it('rejects non-strings', () => {
		expect(isEventType(null)).toBe(false);
		expect(isEventType(42)).toBe(false);
	});
});

describe('isHealthGrade', () => {
	it('accepts all valid grades', () => {
		for (const g of ['EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'CRITICAL']) {
			expect(isHealthGrade(g)).toBe(true);
		}
	});

	it('rejects invalid grades', () => {
		expect(isHealthGrade('excellent')).toBe(false);
		expect(isHealthGrade('BAD')).toBe(false);
		expect(isHealthGrade('')).toBe(false);
		expect(isHealthGrade(null)).toBe(false);
	});
});

describe('isFrequencyClass', () => {
	it('accepts all valid classes', () => {
		for (const c of ['LOW', 'MODERATE', 'HIGH', 'NOT_ENOUGH_DATA']) {
			expect(isFrequencyClass(c)).toBe(true);
		}
	});

	it('rejects invalid classes', () => {
		expect(isFrequencyClass('VERY_HIGH')).toBe(false);
		expect(isFrequencyClass('low')).toBe(false);
		expect(isFrequencyClass(null)).toBe(false);
	});
});

describe('isMemoClassification', () => {
	it('accepts all valid classifications', () => {
		for (const c of ['NOT_APPLICABLE', 'EFFECTIVE', 'INEFFECTIVE', 'PARTIALLY_EFFECTIVE']) {
			expect(isMemoClassification(c)).toBe(true);
		}
	});

	it('rejects invalid classifications', () => {
		expect(isMemoClassification('UNKNOWN')).toBe(false);
		expect(isMemoClassification('effective')).toBe(false);
		expect(isMemoClassification(null)).toBe(false);
	});
});

describe('isSignalKind', () => {
	it('accepts all valid signal kinds', () => {
		for (const k of ['genuine', 'reference-only', 'mixed']) {
			expect(isSignalKind(k)).toBe(true);
		}
	});

	it('rejects invalid signal kinds', () => {
		expect(isSignalKind('GENUINE')).toBe(false);
		expect(isSignalKind('unknown')).toBe(false);
		expect(isSignalKind(null)).toBe(false);
	});
});

describe('isRenderTrigger', () => {
	it('accepts all valid triggers', () => {
		for (const t of ['props', 'state', 'context', 'parent', 'unknown']) {
			expect(isRenderTrigger(t)).toBe(true);
		}
	});

	it('rejects invalid triggers', () => {
		expect(isRenderTrigger('PROPS')).toBe(false);
		expect(isRenderTrigger('hook')).toBe(false);
		expect(isRenderTrigger(null)).toBe(false);
	});
});

describe('isInferredTrigger', () => {
	it('accepts all valid inferred triggers', () => {
		for (const t of ['no-prop-change', 'genuine-prop-change', 'reference-instability', 'mixed']) {
			expect(isInferredTrigger(t)).toBe(true);
		}
	});

	it('rejects invalid inferred triggers', () => {
		expect(isInferredTrigger('no_prop_change')).toBe(false);
		expect(isInferredTrigger('MIXED')).toBe(false);
		expect(isInferredTrigger(null)).toBe(false);
	});
});
