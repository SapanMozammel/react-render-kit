import type { TelemetryEvent } from '@sapanmozammel/render-core-schema';
import type { ComponentSessionData } from '../types/index.js';

export const partitionSessions = (data: readonly ComponentSessionData[]): readonly ComponentSessionData[] => {
	const seen = new Map<string, number>();
	const merged: ComponentSessionData[] = [];

	for (const item of data) {
		const key = `${item.sessionId}::${item.componentName}`;
		const existingIndex = seen.get(key);

		if (existingIndex !== undefined) {
			const existing = merged[existingIndex]!;
			const combined = [...existing.events, ...item.events].sort(
				(a: TelemetryEvent, b: TelemetryEvent) => a.sequenceNumber - b.sequenceNumber,
			);
			merged[existingIndex] = {
				componentName: existing.componentName,
				sessionId: existing.sessionId,
				events: Object.freeze(combined),
				frames: existing.frames ?? item.frames,
			};
		} else {
			seen.set(key, merged.length);
			merged.push(item);
		}
	}

	return Object.freeze(merged);
};
