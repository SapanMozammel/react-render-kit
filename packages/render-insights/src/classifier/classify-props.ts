import type { PropChangeEntry, PropChangeSummary, PropInstability, PropInstabilityKind } from '../types/index.js';

const classifyRefType = (value: unknown): PropInstabilityKind | null => {
	if (typeof value === 'function') return 'function';
	if (Array.isArray(value)) return 'array';
	if (typeof value === 'object' && value !== null) return 'object';
	return null;
};

export const classifyProps = (prev: Record<string, unknown>, curr: Record<string, unknown>, ignoreProps: readonly string[]): PropChangeSummary => {
	const allKeys = [...new Set([...Object.keys(prev), ...Object.keys(curr)])];
	const changed: PropChangeEntry[] = [];
	const unstable: PropInstability[] = [];

	for (const key of allKeys) {
		if (ignoreProps.includes(key)) continue;

		const inPrev = key in prev;
		const inCurr = key in curr;

		if (!inPrev && inCurr) {
			changed.push({ kind: 'added', key, next: curr[key] });
			continue;
		}

		if (inPrev && !inCurr) {
			changed.push({ kind: 'removed', key, prev: prev[key] });
			continue;
		}

		if (inPrev && inCurr && !Object.is(prev[key], curr[key])) {
			const refType = classifyRefType(curr[key]);
			if (refType !== null) {
				changed.push({ kind: 'reference-changed', key, refType });
				unstable.push({ name: key, type: refType });
			} else {
				changed.push({ kind: 'value-changed', key, prev: prev[key], next: curr[key] });
			}
		}
	}

	return { changed, unstable };
};
