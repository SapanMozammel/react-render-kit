import type { MemoryTransport, TelemetryEvent } from '../types/index.js';

export const createMemoryTransport = (): MemoryTransport => {
	let emitted: readonly TelemetryEvent[] = [];

	return {
		name: 'memory',

		emit: (events) => {
			emitted = [...emitted, ...events];
		},

		getEmitted: () => emitted,

		clearEmitted: () => {
			emitted = [];
		},
	};
};
