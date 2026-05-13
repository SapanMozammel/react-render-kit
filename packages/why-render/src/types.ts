export type PropChange =
	| { kind: 'value-changed'; key: string; prev: unknown; next: unknown }
	| { kind: 'reference-changed'; key: string; prev: unknown; next: unknown }
	| { kind: 'added'; key: string; next: unknown }
	| { kind: 'removed'; key: string; prev: unknown };

export interface DiffResult {
	changes: PropChange[];
	unchanged: string[];
}

export type EqualityFn = (a: unknown, b: unknown) => boolean;

export interface WhyDidYouRenderOptions {
	/** Custom equality check. Defaults to `Object.is` (matches React's own comparator). */
	isEqual?: EqualityFn;
	/** Also log the list of unchanged props. Off by default to keep output focused. */
	logUnchanged?: boolean;
}
