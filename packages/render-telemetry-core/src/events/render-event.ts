import type { RenderEvent, RenderEventData, TelemetrySession } from '../types/index.js';
import { createEventBase } from './event-base.js';

export const createRenderEvent = (
	session: TelemetrySession,
	data: RenderEventData,
): { event: RenderEvent; session: TelemetrySession } => {
	const { base, session: updatedSession } = createEventBase(session, 'render');
	return {
		event: {
			...base,
			renderNumber: data.renderNumber,
			triggeredBy: data.triggeredBy ?? 'unknown',
		},
		session: updatedSession,
	};
};
