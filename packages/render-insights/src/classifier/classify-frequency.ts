import type { FrequencyClass } from '../types/index.js';

export const classifyFrequency = (windowCount: number, windowMs: number): FrequencyClass => {
	if (windowCount < 2) return 'NOT_ENOUGH_DATA';
	const rate = windowCount / (windowMs / 1000);
	if (rate > 10.0) return 'HIGH';
	if (rate > 2.0) return 'MODERATE';
	return 'LOW';
};
