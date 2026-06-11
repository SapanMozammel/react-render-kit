import type { FrequencyEvent, FrequencyEventData, TelemetrySession } from '../types/index.js';
import { createEventBase } from './event-base.js';

export const createFrequencyEvent = (session: TelemetrySession, data: FrequencyEventData): { event: FrequencyEvent; session: TelemetrySession } => {
	const { base, session: updatedSession } = createEventBase(session, 'frequency');
	return {
		event: {
			...base,
			renderNumber: data.renderNumber,
			windowMs: data.windowMs,
			windowCount: data.windowCount,
			rate: data.rate,
			classification: data.classification,
			totalRenders: data.totalRenders,
		},
		session: updatedSession,
	};
};
