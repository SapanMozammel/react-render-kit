import type { PropChange } from '../types';

const classifyChange = (key: string, prev: unknown, curr: unknown): PropChange => {
	if (typeof curr === 'function') {
		return { kind: 'reference-changed', key, refType: 'function' };
	}
	if (typeof curr === 'object' && curr !== null) {
		return { kind: 'reference-changed', key, refType: 'object' };
	}
	return { kind: 'value-changed', key, prev, next: curr };
};

export const diffProps = (prev: Record<string, unknown>, curr: Record<string, unknown>): PropChange[] => {
	const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
	const changes: PropChange[] = [];

	for (const key of allKeys) {
		const hasPrev = Object.prototype.hasOwnProperty.call(prev, key);
		const hasCurr = Object.prototype.hasOwnProperty.call(curr, key);

		if (!hasPrev && hasCurr) {
			changes.push({ kind: 'added', key, next: curr[key] });
		} else if (hasPrev && !hasCurr) {
			changes.push({ kind: 'removed', key, prev: prev[key] });
		} else if (!Object.is(prev[key], curr[key])) {
			changes.push(classifyChange(key, prev[key], curr[key]));
		}
	}

	return changes;
};
