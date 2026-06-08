/* eslint-disable no-console */
import type { PropChange } from '../types';

const formatValue = (v: unknown): string => {
	if (v === null) return 'null';
	if (v === undefined) return 'undefined';
	if (typeof v === 'symbol') return v.toString();
	if (typeof v === 'function') return `[Function: ${v.name || 'anonymous'}]`;
	if (typeof v === 'string') return `"${v}"`;
	try {
		return JSON.stringify(v);
	} catch {
		return String(v);
	}
};

export const logChanges = (componentName: string, changes: PropChange[]): void => {
	if (changes.length === 0) return;

	const maxKeyLen = Math.max(...changes.map((c) => c.key.length));
	const pad = maxKeyLen + 2;

	const valueLines: string[] = [];
	const referenceLines: string[] = [];
	const addedLines: string[] = [];
	const removedLines: string[] = [];

	for (const change of changes) {
		switch (change.kind) {
			case 'value-changed':
				valueLines.push(`  ${change.key.padEnd(pad)}  ${formatValue(change.prev)} → ${formatValue(change.next)}`);
				break;
			case 'reference-changed':
				referenceLines.push(`  ${change.key.padEnd(pad)}  ${change.refType} reference changed`);
				break;
			case 'added':
				addedLines.push(`  ${change.key.padEnd(pad)}  ${formatValue(change.next)}`);
				break;
			case 'removed':
				removedLines.push(`  ${change.key.padEnd(pad)}  was ${formatValue(change.prev)}`);
				break;
		}
	}

	console.groupCollapsed(`[why-render] <${componentName}>`);

	if (valueLines.length > 0) {
		console.log('');
		console.log('Primitive Changes');
		console.log('-----------------');
		for (const line of valueLines) console.log(line);
	}

	if (referenceLines.length > 0) {
		console.log('');
		console.log('Reference Changes');
		console.log('-----------------');
		for (const line of referenceLines) console.log(line);
	}

	if (addedLines.length > 0) {
		console.log('');
		console.log('Added Props');
		console.log('-----------');
		for (const line of addedLines) console.log(line);
	}

	if (removedLines.length > 0) {
		console.log('');
		console.log('Removed Props');
		console.log('-------------');
		for (const line of removedLines) console.log(line);
	}

	console.groupEnd();
};
