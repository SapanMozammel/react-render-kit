import type { MemoClassification, RenderSignal } from '../types/index.js';

export const classifySession = (signals: readonly RenderSignal[]): MemoClassification => {
	if (signals.length === 0) return 'NOT_APPLICABLE';
	const kinds = new Set(signals.map((s) => s.kind));
	if (kinds.size === 1 && kinds.has('genuine')) return 'EFFECTIVE';
	if (kinds.size === 1 && kinds.has('reference-only')) return 'INEFFECTIVE';
	return 'PARTIALLY_EFFECTIVE';
};
