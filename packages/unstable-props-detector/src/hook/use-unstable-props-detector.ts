import { useRef } from 'react';
import { detectUnstableProps } from '../detector/detector';
import { logInstability, logStable } from '../logger/unstable-logger';
import type { UnstablePropsOptions } from '../types';

export const useUnstablePropsDetector = (componentName: string, props: Record<string, unknown>, options?: UnstablePropsOptions): void => {
	const prevPropsRef = useRef<Record<string, unknown> | null>(null);
	const reportCountRef = useRef(0);

	if (process.env.NODE_ENV !== 'development') return;

	const { enabled = true, ignoreProps = [], maxReports = 10, logOnEveryRender = false } = options ?? {};

	if (!enabled) return;

	const prev = prevPropsRef.current;

	if (prev !== null) {
		const unstable = detectUnstableProps(prev, props, ignoreProps);

		if (unstable.length > 0 && reportCountRef.current < maxReports) {
			const isLastReport = reportCountRef.current + 1 === maxReports;
			reportCountRef.current += 1;
			logInstability(componentName, unstable, reportCountRef.current, maxReports, isLastReport);
		} else if (unstable.length === 0 && logOnEveryRender) {
			logStable(componentName);
		}
	}

	prevPropsRef.current = props;
};
