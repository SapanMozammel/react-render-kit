import type { FrequencyClass, MemoClassification, PropInstability } from '../types/index.js';

type RecommendationContext = {
	unstableProps: PropInstability[];
	sessionClass: MemoClassification;
	frequencyClass: FrequencyClass;
};

const formatNames = (props: PropInstability[]): string => {
	if (props.length === 1) return `"${props[0].name}"`;
	if (props.length === 2) return `"${props[0].name}" and "${props[1].name}"`;
	const last = props[props.length - 1];
	const rest = props.slice(0, -1);
	return `${rest.map((p) => `"${p.name}"`).join(', ')}, and "${last.name}"`;
};

const formatHints = (props: PropInstability[]): string => {
	const fns = props.filter((p) => p.type === 'function');
	const objs = props.filter((p) => p.type !== 'function');

	if (fns.length > 0 && objs.length === 0) {
		return `wrap ${formatNames(fns)} with useCallback`;
	}
	if (fns.length === 0 && objs.length > 0) {
		return `wrap ${formatNames(objs)} with useMemo`;
	}
	return `wrap ${formatNames(fns)} with useCallback and ${formatNames(objs)} with useMemo`;
};

export const generateRecommendations = (ctx: RecommendationContext): string[] => {
	const results: string[] = [];

	// Rule 1 — STABILIZE_INEFFECTIVE
	if (ctx.unstableProps.length > 0 && ctx.sessionClass === 'INEFFECTIVE') {
		results.push(
			`Reference-only prop changes are defeating memoization. Stabilize ${formatNames(ctx.unstableProps)} — ${formatHints(ctx.unstableProps)}.`,
		);
	}

	// Rule 2 — STABILIZE_PARTIAL
	if (ctx.unstableProps.length > 0 && ctx.sessionClass === 'PARTIALLY_EFFECTIVE') {
		results.push(
			`Reference instability is partially defeating memoization. Stabilize ${formatNames(ctx.unstableProps)} to eliminate reference-driven re-renders.`,
		);
	}

	// Rule 3 — HIGH_FREQUENCY_COMPOUND
	if (ctx.frequencyClass === 'HIGH' && ctx.unstableProps.length > 0) {
		results.push(
			`High render frequency compounded by unstable props. Stabilize ${formatNames(ctx.unstableProps)} first, then investigate render triggers upstream.`,
		);
	}

	// Rule 4 — HIGH_FREQUENCY_CLEAN
	if (ctx.frequencyClass === 'HIGH' && ctx.unstableProps.length === 0) {
		results.push(
			'High render frequency with no reference instability. Investigate parent state updates or context subscription breadth.',
		);
	}

	if (results.length > 0) return results.slice(0, 3);

	// Rule 5 — WELL_OPTIMIZED (fallback)
	return ['Component is well-optimized. All observed re-renders are data-driven.'];
};
