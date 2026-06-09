export type MemoClassification = 'NOT_APPLICABLE' | 'EFFECTIVE' | 'INEFFECTIVE' | 'PARTIALLY_EFFECTIVE';

export type PropInstabilityKind = 'function' | 'array' | 'object';

export type SignalKind = 'genuine' | 'reference-only' | 'mixed';

export type RenderSignal = {
	kind: SignalKind;
	genuineKeys: string[];
	unstableProps: Array<{ name: string; type: PropInstabilityKind }>;
};

export type MemoEffectOptions = {
	enabled?: boolean;
	ignoreProps?: string[];
	maxReports?: number;
	logOnEveryRender?: boolean;
};
