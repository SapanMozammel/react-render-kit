import { useRef } from 'react';
import { diffProps } from './diff-props';
import { isDev } from './env';
import { logChanges } from './logger';
import type { WhyDidYouRenderOptions } from './types';

export const useWhyDidYouRender = <P extends Record<string, unknown>>(componentName: string, props: P, options: WhyDidYouRenderOptions = {}): void => {
	const previousProps = useRef<P | undefined>(undefined);

	if (!isDev) return;

	const prev = previousProps.current;
	if (prev !== undefined) {
		const diff = diffProps(prev, props, options.isEqual);
		logChanges(componentName, diff, { logUnchanged: options.logUnchanged });
	}

	previousProps.current = props;
};
