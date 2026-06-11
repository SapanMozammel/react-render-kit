import type {
	LocalStorageTransportOptions,
	TelemetryEvent,
	TelemetryTransport,
} from '../types/index.js';

export const createLocalStorageTransport = (
	storageKey: string,
	options?: LocalStorageTransportOptions,
): TelemetryTransport => {
	const maxBytes = options?.maxBytes ?? 2_000_000;
	const onExceed = options?.onExceed ?? 'prune';

	return {
		name: 'local-storage',

		emit: (events) => {
			if (typeof localStorage === 'undefined') return;

			let existing: TelemetryEvent[] = [];
			try {
				existing = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as TelemetryEvent[];
				if (!Array.isArray(existing)) existing = [];
			} catch {
				existing = [];
			}

			let merged: TelemetryEvent[] = [...existing, ...events];
			let serialized = JSON.stringify(merged);

			if (serialized.length > maxBytes) {
				if (onExceed === 'prune') {
					while (serialized.length > maxBytes && merged.length > 0) {
						merged.shift();
						serialized = JSON.stringify(merged);
					}
					if (merged.length === 0) return;
				} else if (onExceed === 'clear') {
					merged = [...events];
					serialized = JSON.stringify(merged);
				} else {
					return;
				}
			}

			try {
				localStorage.setItem(storageKey, serialized);
			} catch {
				// quota exceeded — silently discard
			}
		},
	};
};
