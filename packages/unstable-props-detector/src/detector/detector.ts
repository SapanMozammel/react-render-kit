import type { PropInstability, PropType } from '../types';

const classifyRefType = (value: unknown): PropType | null => {
	if (typeof value === 'function') return 'function';
	if (Array.isArray(value)) return 'array';
	if (typeof value === 'object' && value !== null) return 'object';
	return null;
};

export const detectUnstableProps = (prev: Record<string, unknown>, curr: Record<string, unknown>, ignoreProps: string[]): PropInstability[] => {
	const result: PropInstability[] = [];

	for (const key of Object.keys(curr)) {
		if (ignoreProps.includes(key)) continue;
		if (Object.is(prev[key], curr[key])) continue;

		const type = classifyRefType(curr[key]);
		if (type === null) continue;

		result.push({ name: key, type });
	}

	return result;
};
