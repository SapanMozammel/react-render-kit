import React from 'react';
import type { InsightReport } from '@sapanmozammel/render-insights';
import { createPlaygroundStore } from '../store/playground-store.js';
import type { CaptureOptions } from '../types/index.js';

type InsightCaptureResult = {
	onReport: (report: InsightReport) => void;
	reports: readonly InsightReport[];
	clearReports: () => void;
};

export const useInsightCapture = (options?: CaptureOptions): InsightCaptureResult => {
	const maxEntries = options?.maxEntries ?? 50;
	const storeRef = React.useRef<ReturnType<typeof createPlaygroundStore> | null>(null);
	if (storeRef.current === null) {
		storeRef.current = createPlaygroundStore(maxEntries);
	}
	const store = storeRef.current;

	const reports = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

	const onReport = React.useCallback(
		(report: InsightReport) => {
			if (process.env.NODE_ENV !== 'development') return;
			store.push(report);
		},
		[store]
	);

	const clearReports = React.useCallback(() => {
		store.clear();
	}, [store]);

	if (process.env.NODE_ENV !== 'development') {
		return { onReport: () => {}, reports: [], clearReports: () => {} };
	}

	return { onReport, reports, clearReports };
};
