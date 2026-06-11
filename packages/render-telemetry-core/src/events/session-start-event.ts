import type { SessionStartEvent, TelemetrySession } from '../types/index.js';
import { createEventBase } from './event-base.js';

export const createSessionStartEvent = (session: TelemetrySession): { event: SessionStartEvent; session: TelemetrySession } => {
	const { base, session: updatedSession } = createEventBase(session, 'session-start');
	return { event: { ...base }, session: updatedSession };
};
