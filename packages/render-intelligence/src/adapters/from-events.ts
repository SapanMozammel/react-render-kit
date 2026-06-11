import type { TelemetryEvent } from '@sapanmozammel/render-core-schema';
import type { ComponentSessionData } from '../types/index.js';

export const fromEvents = (events: readonly TelemetryEvent[]): readonly ComponentSessionData[] => {
	const map = new Map<string, TelemetryEvent[]>();

	for (const event of events) {
		const key = `${event.sessionId}::${event.componentName}`;
		const bucket = map.get(key);
		if (bucket !== undefined) {
			bucket.push(event);
		} else {
			map.set(key, [event]);
		}
	}

	const result: ComponentSessionData[] = [];
	for (const [key, bucket] of map) {
		const sep = key.indexOf('::');
		const sessionId = key.slice(0, sep);
		const componentName = key.slice(sep + 2);
		result.push({
			componentName,
			sessionId,
			events: Object.freeze(bucket.slice().sort((a, b) => a.sequenceNumber - b.sequenceNumber)),
			frames: null,
		});
	}
	return Object.freeze(result);
};
