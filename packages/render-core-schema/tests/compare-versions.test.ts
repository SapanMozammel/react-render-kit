import { describe, it, expect } from 'vitest';
import { compareSchemaVersions, isSchemaVersionAtLeast } from '../src/utils/compare-versions.js';
import type { SchemaVersion } from '../src/version/schema-version.js';

const v = (s: string) => s as SchemaVersion;

describe('compareSchemaVersions', () => {
	it('returns 0 for equal versions', () => {
		expect(compareSchemaVersions(v('1.0.0'), v('1.0.0'))).toBe(0);
		expect(compareSchemaVersions(v('2.5.3'), v('2.5.3'))).toBe(0);
	});

	it('compares major version', () => {
		expect(compareSchemaVersions(v('2.0.0'), v('1.0.0'))).toBe(1);
		expect(compareSchemaVersions(v('1.0.0'), v('2.0.0'))).toBe(-1);
	});

	it('compares minor version when major is equal', () => {
		expect(compareSchemaVersions(v('1.2.0'), v('1.1.0'))).toBe(1);
		expect(compareSchemaVersions(v('1.0.0'), v('1.1.0'))).toBe(-1);
	});

	it('compares patch version when major and minor are equal', () => {
		expect(compareSchemaVersions(v('1.0.1'), v('1.0.0'))).toBe(1);
		expect(compareSchemaVersions(v('1.0.0'), v('1.0.1'))).toBe(-1);
	});

	it('major beats minor and patch', () => {
		expect(compareSchemaVersions(v('2.0.0'), v('1.9.9'))).toBe(1);
	});

	it('minor beats patch', () => {
		expect(compareSchemaVersions(v('1.1.0'), v('1.0.9'))).toBe(1);
	});
});

describe('isSchemaVersionAtLeast', () => {
	it('returns true when version equals minimum', () => {
		expect(isSchemaVersionAtLeast(v('1.0.0'), v('1.0.0'))).toBe(true);
	});

	it('returns true when version is greater than minimum', () => {
		expect(isSchemaVersionAtLeast(v('2.0.0'), v('1.0.0'))).toBe(true);
		expect(isSchemaVersionAtLeast(v('1.1.0'), v('1.0.0'))).toBe(true);
		expect(isSchemaVersionAtLeast(v('1.0.1'), v('1.0.0'))).toBe(true);
	});

	it('returns false when version is less than minimum', () => {
		expect(isSchemaVersionAtLeast(v('1.0.0'), v('2.0.0'))).toBe(false);
		expect(isSchemaVersionAtLeast(v('1.0.0'), v('1.1.0'))).toBe(false);
		expect(isSchemaVersionAtLeast(v('1.0.0'), v('1.0.1'))).toBe(false);
	});
});
