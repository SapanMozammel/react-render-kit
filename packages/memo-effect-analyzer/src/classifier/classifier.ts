import type { MemoClassification, PropInstabilityKind, RenderSignal, SignalKind } from '../types/index.js';

const isReferenceType = (value: unknown): boolean => {
	if (typeof value === 'function') return true;
	if (Array.isArray(value)) return true;
	if (typeof value === 'object' && value !== null) return true;
	return false;
};

const getReferenceKind = (value: unknown): PropInstabilityKind => {
	if (typeof value === 'function') return 'function';
	if (Array.isArray(value)) return 'array';
	return 'object';
};

export const classifyRender = (prev: Record<string, unknown>, curr: Record<string, unknown>, ignoreProps: readonly string[]): RenderSignal | null => {
	const allKeys = [...new Set([...Object.keys(prev), ...Object.keys(curr)])];

	const changedKeys = allKeys.filter((key) => !ignoreProps.includes(key) && !Object.is(prev[key], curr[key]));

	if (changedKeys.length === 0) return null;

	let hasGenuineSide = false;
	let hasReferenceSide = false;

	for (const key of changedKeys) {
		if (!(key in prev) || !(key in curr)) {
			hasGenuineSide = true;
		} else if (isReferenceType(curr[key])) {
			hasReferenceSide = true;
		} else {
			hasGenuineSide = true;
		}
	}

	const kind: SignalKind = hasGenuineSide && hasReferenceSide ? 'mixed' : hasGenuineSide ? 'genuine' : 'reference-only';

	return {
		kind,
		genuineKeys: changedKeys.filter((key) => {
			if (!(key in prev) || !(key in curr)) return true;
			return !isReferenceType(curr[key]);
		}),
		unstableProps: changedKeys.filter((key) => key in prev && key in curr && isReferenceType(curr[key])).map((key) => ({ name: key, type: getReferenceKind(curr[key]) })),
	};
};

export const classifySession = (signals: readonly RenderSignal[]): MemoClassification => {
	if (signals.length === 0) return 'NOT_APPLICABLE';
	const kinds = new Set(signals.map((s) => s.kind));
	if (kinds.size === 1 && kinds.has('genuine')) return 'EFFECTIVE';
	if (kinds.size === 1 && kinds.has('reference-only')) return 'INEFFECTIVE';
	return 'PARTIALLY_EFFECTIVE';
};
