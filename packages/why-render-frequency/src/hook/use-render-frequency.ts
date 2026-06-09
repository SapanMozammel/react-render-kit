import { useRef } from 'react';
import { logFrequency } from '../logger/frequency-logger';
import type { RenderFrequencyOptions } from '../types';

export const useRenderFrequency = (componentName: string, options?: RenderFrequencyOptions): void => {
	const countRef = useRef(0);
	const timestampsRef = useRef<number[]>([]);

	if (process.env.NODE_ENV !== 'development') return;
	if (options?.enabled === false) return;

	const windowMs = Math.max(options?.windowMs ?? 10000, 1);
	const sampleEvery = Math.max(options?.sampleEvery ?? 10, 1);
	const now = Date.now();

	countRef.current += 1;
	timestampsRef.current.push(now);

	const cutoff = now - windowMs;
	timestampsRef.current = timestampsRef.current.filter((t) => t > cutoff);

	const count = countRef.current;
	const windowCount = timestampsRef.current.length;

	if (count % sampleEvery === 0) {
		logFrequency(componentName, count, windowCount, windowMs);
	}
};
