import React from 'react';
import { type InsightReport, useRenderInsights } from '@sapanmozammel/render-insights';
import { PlaygroundContext } from '../context/playground-context.js';
import type { PlaygroundStore, RenderPlaygroundOptions } from '../types/index.js';

export const useRenderPlayground = (componentName: string, props: Record<string, unknown>, options?: RenderPlaygroundOptions): void => {
	// All hooks unconditionally before any early return (rules of hooks)
	const store = React.useContext(PlaygroundContext);
	const storeRef = React.useRef<PlaygroundStore | null>(null);
	const optionsRef = React.useRef(options);
	const onReportRef = React.useRef<((r: InsightReport) => void) | null>(null);

	// Update latest values in refs every render (not hooks — just mutations)
	storeRef.current = store;
	optionsRef.current = options;

	// Build the stable onReport bridge once; guards production internally.
	// queueMicrotask defers the store push to after the current render completes,
	// preventing the "setState during render" error when useRenderInsights fires
	// onReport synchronously inside the render phase.
	if (onReportRef.current === null) {
		onReportRef.current = (r: InsightReport) => {
			if (process.env.NODE_ENV !== 'development') return;
			queueMicrotask(() => {
				storeRef.current?.push(r);
				try {
					optionsRef.current?.onReport?.(r);
				} catch (e) {
					console.error('[render-playground] onReport callback threw:', e);
				}
			});
		};
	}

	// Always call useRenderInsights — it has its own production guard
	useRenderInsights(componentName, props, {
		...options,
		onReport: onReportRef.current,
	});

	// Dev-only: validate provider exists (throw after hooks, never skip hooks)
	if (process.env.NODE_ENV === 'development' && store === null) {
		throw new Error('[render-playground] useRenderPlayground must be used inside <PlaygroundProvider>');
	}
};
