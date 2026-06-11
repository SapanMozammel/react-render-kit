import { describe, it, expect } from 'vitest';
import { CURRENT_SCHEMA_VERSION, EVENT_SCHEMA_VERSIONS, isKnownEventType, type TelemetryEventType } from '../src/index.js';

const ALL_EVENT_TYPES: TelemetryEventType[] = ['session-start', 'render', 'prop-change', 'frequency', 'score', 'recommendation', 'session-end'];

describe('schema versions', () => {
	it('CURRENT_SCHEMA_VERSION is 1.0.0', () => {
		expect(CURRENT_SCHEMA_VERSION).toBe('1.0.0');
	});

	it('EVENT_SCHEMA_VERSIONS has exactly 7 keys', () => {
		expect(Object.keys(EVENT_SCHEMA_VERSIONS)).toHaveLength(7);
	});

	it('EVENT_SCHEMA_VERSIONS has an entry for every TelemetryEventType', () => {
		ALL_EVENT_TYPES.forEach((type) => {
			expect(EVENT_SCHEMA_VERSIONS).toHaveProperty(type);
			expect(EVENT_SCHEMA_VERSIONS[type]).toBe('1.0.0');
		});
	});
});

describe('isKnownEventType', () => {
	it('returns true for all 7 event types', () => {
		ALL_EVENT_TYPES.forEach((type) => {
			expect(isKnownEventType(type)).toBe(true);
		});
	});

	it('returns false for unknown string', () => {
		expect(isKnownEventType('unknown-type')).toBe(false);
	});

	it('returns false for number', () => {
		expect(isKnownEventType(123)).toBe(false);
	});

	it('returns false for null', () => {
		expect(isKnownEventType(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isKnownEventType(undefined)).toBe(false);
	});
});
