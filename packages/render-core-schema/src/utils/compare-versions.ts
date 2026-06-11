import type { SchemaVersion } from '../version/schema-version.js';

const parseParts = (v: SchemaVersion): [number, number, number] => {
	const parts = v.split('.');
	const major = Number(parts[0] ?? 0);
	const minor = Number(parts[1] ?? 0);
	const patch = Number(parts[2] ?? 0);
	return [major, minor, patch];
};

export const compareSchemaVersions = (a: SchemaVersion, b: SchemaVersion): -1 | 0 | 1 => {
	const [aMaj, aMin, aPatch] = parseParts(a);
	const [bMaj, bMin, bPatch] = parseParts(b);
	if (aMaj !== bMaj) return aMaj > bMaj ? 1 : -1;
	if (aMin !== bMin) return aMin > bMin ? 1 : -1;
	if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1;
	return 0;
};

export const isSchemaVersionAtLeast = (version: SchemaVersion, minimum: SchemaVersion): boolean =>
	compareSchemaVersions(version, minimum) >= 0;
