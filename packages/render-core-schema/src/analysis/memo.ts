import type { PropInstability } from '../props/prop-diff.js';

export type SignalKind = 'genuine' | 'reference-only' | 'mixed';

export type MemoClassification = 'NOT_APPLICABLE' | 'EFFECTIVE' | 'INEFFECTIVE' | 'PARTIALLY_EFFECTIVE';

export type RenderSignal = {
	readonly kind: SignalKind;
	readonly genuineKeys: readonly string[];
	readonly unstableProps: readonly PropInstability[];
};

export type MemoSessionSummary = {
	readonly signalKind: SignalKind | null;
	readonly sessionClass: MemoClassification;
	readonly genuineCount: number;
	readonly referenceOnlyCount: number;
	readonly mixedCount: number;
};
