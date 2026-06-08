'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type PropChange =
	| { kind: 'value-changed'; key: string; prev: unknown; next: unknown }
	| { kind: 'reference-changed'; key: string; refType: 'object' | 'function'; prev: unknown; next: unknown }
	| { kind: 'added'; key: string; next: unknown }
	| { kind: 'removed'; key: string; prev: unknown };

export type LogEntry = {
	id: string;
	at: Date;
	componentName: string;
	renderNumber: number;
	changes: PropChange[];
};

const classifyChange = (key: string, prev: unknown, curr: unknown): PropChange => {
	if (typeof curr === 'function') return { kind: 'reference-changed', key, refType: 'function', prev, next: curr };
	if (typeof curr === 'object' && curr !== null) return { kind: 'reference-changed', key, refType: 'object', prev, next: curr };
	return { kind: 'value-changed', key, prev, next: curr };
};

const computeChanges = (
	prev: Record<string, unknown>,
	curr: Record<string, unknown>,
): PropChange[] => {
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

export const formatValue = (v: unknown): string => {
	if (v === null) return 'null';
	if (v === undefined) return 'undefined';
	if (typeof v === 'symbol') return v.toString();
	if (typeof v === 'function') return `[Function: ${(v as { name?: string }).name ?? 'anonymous'}]`;
	if (typeof v === 'object') {
		try {
			return JSON.stringify(v);
		} catch {
			return '[object]';
		}
	}
	if (typeof v === 'string') return `"${v}"`;
	return String(v);
};

export const usePropLog = (
	componentName: string,
	props: Record<string, unknown>,
	options?: { enabled?: boolean },
) => {
	const enabled = options?.enabled !== false;
	const prevRef = useRef<Record<string, unknown> | null>(null);
	const pendingRef = useRef<LogEntry | null>(null);
	const renderNumberRef = useRef(0);
	const [entries, setEntries] = useState<LogEntry[]>([]);

	renderNumberRef.current += 1;

	// Mirrors useWhyRender's render-body logic exactly:
	// - first render: initialise prevRef, no diff
	// - disabled: neither diff nor advance prevRef (so re-enabling shows accumulated changes)
	// - enabled: compute diff, advance prevRef
	if (prevRef.current === null) {
		prevRef.current = props;
	} else if (enabled) {
		const changes = computeChanges(prevRef.current, props);
		// Only queue an entry when there are actual changes.
		// An empty-changes entry would cause useEffect → setEntries → re-render → repeat (loop).
		if (changes.length > 0) {
			pendingRef.current = {
				id: crypto.randomUUID(),
				at: new Date(),
				componentName,
				renderNumber: renderNumberRef.current,
				changes,
			};
		} else {
			pendingRef.current = null;
		}
		prevRef.current = props;
	}

	// Flush pending entry after render — side effect: appending to event log, not deriving state
	useEffect(() => {
		if (pendingRef.current !== null) {
			const entry = pendingRef.current;
			setEntries((prev) => [entry, ...prev].slice(0, 30));
			pendingRef.current = null;
		}
	}); // intentionally no dep array — runs after every render

	const clear = useCallback(() => setEntries([]), []);

	return { entries, clear };
};
