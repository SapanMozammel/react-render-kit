import { useRef } from 'react';
import { diffProps } from '../diff/diff-props';
import { logChanges } from '../logger/console-logger';
import type { WhyRenderOptions } from '../types';

export const useWhyRender = (componentName: string, props: Record<string, unknown>, options?: WhyRenderOptions): void => {
	const prevRef = useRef<Record<string, unknown> | null>(null);

	if (process.env.NODE_ENV !== 'development') return;
	if (options?.enabled === false) return;

	if (prevRef.current === null) {
		prevRef.current = props;
		return;
	}

	const changes = diffProps(prevRef.current, props);
	logChanges(componentName, changes);
	prevRef.current = props;
};
