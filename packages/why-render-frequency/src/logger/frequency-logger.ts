/* eslint-disable no-console */

const formatRate = (windowCount: number, windowMs: number): string => {
	const rate = windowCount / (windowMs / 1000);
	return `${rate.toFixed(1)} renders/sec`;
};

const getObservation = (windowCount: number, windowMs: number): string => {
	const rate = windowCount / (windowMs / 1000);
	if (rate > 10) return 'High render frequency detected';
	if (rate > 2) return 'Moderate render activity';
	return 'Low render activity';
};

const formatWindowLabel = (windowMs: number): string => {
	const secs = Math.round(windowMs / 1000);
	return `Window (last ${secs}s)`;
};

export const logFrequency = (componentName: string, count: number, windowCount: number, windowMs: number): void => {
	const windowLabel = formatWindowLabel(windowMs);
	const separator = '-'.repeat(windowLabel.length);

	console.groupCollapsed(`[why-render-frequency] <${componentName}>`);

	console.log('');
	console.log('Total Renders');
	console.log('-------------');
	console.log(`  ${count}`);

	console.log('');
	console.log(windowLabel);
	console.log(separator);
	console.log(`  ${windowCount} renders`);

	console.log('');
	console.log('Rate');
	console.log('----');
	console.log(`  ${formatRate(windowCount, windowMs)}`);

	console.log('');
	console.log('Observation');
	console.log('-----------');
	console.log(`  ${getObservation(windowCount, windowMs)}`);

	console.groupEnd();
};
