import type { InsightReport } from '@sapanmozammel/render-insights';
import type { PlaygroundStore } from '../types/index.js';

const SERVER_SNAPSHOT: readonly InsightReport[] = [];

export const createPlaygroundStore = (maxEntries = 50): PlaygroundStore => {
	let snapshot: readonly InsightReport[] = [];
	const listeners = new Set<() => void>();

	const notify = () => {
		listeners.forEach((l) => l());
	};

	return {
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		getSnapshot() {
			return snapshot;
		},

		getServerSnapshot() {
			return SERVER_SNAPSHOT;
		},

		push(report) {
			snapshot = [...snapshot, report].slice(-maxEntries);
			notify();
		},

		clear() {
			snapshot = [];
			notify();
		},
	};
};
