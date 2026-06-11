export type PropRefType = 'function' | 'array' | 'object';

export type PropChangeKind = 'value-changed' | 'reference-changed' | 'added' | 'removed';

export type PropChangeEntry =
	| { readonly kind: 'value-changed'; readonly key: string; readonly prev: unknown; readonly next: unknown }
	| { readonly kind: 'reference-changed'; readonly key: string; readonly refType: PropRefType }
	| { readonly kind: 'added'; readonly key: string; readonly next: unknown }
	| { readonly kind: 'removed'; readonly key: string; readonly prev: unknown };

export type PropInstability = {
	readonly name: string;
	readonly type: PropRefType;
};

export type PropDiffSnapshot = {
	readonly changed: readonly PropChangeEntry[];
	readonly unstable: readonly PropInstability[];
};
