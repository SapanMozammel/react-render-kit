import type { DiffResult, EqualityFn, PropChange } from './types';

const defaultIsEqual: EqualityFn = Object.is;

const isReferenceType = (v: unknown): boolean => (typeof v === 'object' && v !== null) || typeof v === 'function';

export const diffProps = (prev: Record<string, unknown>, next: Record<string, unknown>, isEqual: EqualityFn = defaultIsEqual): DiffResult => {
	const changes: PropChange[] = [];
	const unchanged: string[] = [];

	const keys = new Set<string>();
	for (const k of Object.keys(prev)) keys.add(k);
	for (const k of Object.keys(next)) keys.add(k);

	for (const key of keys) {
		const hasPrev = Object.prototype.hasOwnProperty.call(prev, key);
		const hasNext = Object.prototype.hasOwnProperty.call(next, key);

		if (!hasPrev && hasNext) {
			changes.push({ kind: 'added', key, next: next[key] });
			continue;
		}
		if (hasPrev && !hasNext) {
			changes.push({ kind: 'removed', key, prev: prev[key] });
			continue;
		}

		const a = prev[key];
		const b = next[key];
		if (isEqual(a, b)) {
			unchanged.push(key);
			continue;
		}

		if (isReferenceType(a) || isReferenceType(b)) {
			changes.push({ kind: 'reference-changed', key, prev: a, next: b });
		} else {
			changes.push({ kind: 'value-changed', key, prev: a, next: b });
		}
	}

	return { changes, unchanged };
};
