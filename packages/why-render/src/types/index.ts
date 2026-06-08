export type WhyRenderOptions = {
	enabled?: boolean;
};

export type PropChange =
	| { kind: 'value-changed'; key: string; prev: unknown; next: unknown }
	| { kind: 'reference-changed'; key: string; refType: 'object' | 'function' }
	| { kind: 'added'; key: string; next: unknown }
	| { kind: 'removed'; key: string; prev: unknown };
