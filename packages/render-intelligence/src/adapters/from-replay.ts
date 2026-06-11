import type { ReplaySession, TelemetryEvent } from '@sapanmozammel/render-core-schema';
import type { ComponentSessionData } from '../types/index.js';

export const fromReplay = (sessions: readonly ReplaySession[]): readonly ComponentSessionData[] => {
	const result: ComponentSessionData[] = [];

	for (const session of sessions) {
		const events: TelemetryEvent[] = [];

		for (const frame of session.frames) {
			events.push(frame.renderEvent);
			if (frame.propChangeEvent !== null) events.push(frame.propChangeEvent);
			if (frame.frequencyEvent !== null) events.push(frame.frequencyEvent);
			if (frame.scoreEvent !== null) events.push(frame.scoreEvent);
			if (frame.recommendationEvent !== null) events.push(frame.recommendationEvent);
		}

		events.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

		result.push({
			componentName: session.componentName,
			sessionId: session.id,
			events: Object.freeze(events),
			frames: session.frames,
		});
	}

	return Object.freeze(result);
};
