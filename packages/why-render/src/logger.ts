/* eslint-disable no-console */
import type { DiffResult, PropChange } from './types';

const formatValue = (v: unknown): string => {
	if (typeof v === 'function') return `[Function${v.name ? `: ${v.name}` : ''}]`;
	if (typeof v === 'string') return JSON.stringify(v);
	if (v === undefined) return 'undefined';
	try {
		return JSON.stringify(v);
	} catch {
		return String(v);
	}
};

const formatChange = (change: PropChange): string => {
	switch (change.kind) {
		case 'value-changed':
			return `- prop "${change.key}" changed: ${formatValue(change.prev)} → ${formatValue(change.next)}`;
		case 'reference-changed':
			return `- prop "${change.key}" reference changed`;
		case 'added':
			return `- prop "${change.key}" added: ${formatValue(change.next)}`;
		case 'removed':
			return `- prop "${change.key}" removed (was ${formatValue(change.prev)})`;
	}
};

export type LogOptions = {
	logUnchanged?: boolean | undefined;
};

export const logChanges = (componentName: string, diff: DiffResult, options: LogOptions = {}): void => {
	if (diff.changes.length === 0 && !options.logUnchanged) return;

	console.groupCollapsed(`[${componentName}] re-rendered because:`);
	for (const change of diff.changes) console.log(formatChange(change));
	if (options.logUnchanged && diff.unchanged.length > 0) {
		console.log(`- unchanged: ${diff.unchanged.join(', ')}`);
	}
	console.groupEnd();
};
