import { useRef } from 'react';
import { diffProps } from '../diff/diff-props';
import { isDev } from '../env';
import { logChanges } from '../logger/console-logger';
import type { WhyRenderOptions } from '../types';

export const useWhyRender = (componentName: string, props: Record<string, unknown>, options?: WhyRenderOptions): void => {
	const prevRef = useRef<Record<string, unknown> | null>(null);

	if (!isDev) return;
	if (options?.enabled === false) return;

	if (prevRef.current === null) {
		prevRef.current = props;
		return;
	}

	const diff = diffProps(prevRef.current, props);
	logChanges(componentName, diff);
	prevRef.current = props;
};
