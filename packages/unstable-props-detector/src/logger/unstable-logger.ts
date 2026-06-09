/* eslint-disable no-console */
import type { PropInstability } from '../types';

export const logInstability = (componentName: string, unstable: PropInstability[], reportCount: number, maxReports: number, isLastReport: boolean): void => {
	const maxKeyLen = Math.max(...unstable.map((u) => u.name.length));
	const pad = maxKeyLen + 2;

	const header = 'Potentially Unstable Props';

	console.groupCollapsed(`[unstable-props-detector] <${componentName}>`);

	console.log('');
	console.log(header);
	console.log('-'.repeat(header.length));
	for (const { name, type } of unstable) {
		console.log(`  ${name.padEnd(pad)}  ${type}    new reference`);
	}

	const note = 'Memoization Note';
	console.log('');
	console.log(note);
	console.log('-'.repeat(note.length));
	console.log(`  Props above changed identity and may prevent React.memo from skipping re-renders of <${componentName}>.`);
	console.log('  Wrap functions with useCallback, objects and arrays with useMemo.');

	console.log('');
	if (isLastReport) {
		console.log(`[report ${reportCount} / ${maxReports} — further reports suppressed for this instance]`);
	} else {
		console.log(`[report ${reportCount} / ${maxReports}]`);
	}

	console.groupEnd();
};

export const logStable = (componentName: string): void => {
	console.log(`[unstable-props-detector] <${componentName}> — stable`);
};
