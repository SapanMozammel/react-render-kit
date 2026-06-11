import type { SessionEndEvent, SessionEndEventData, TelemetrySession } from '../types/index.js';
import { createEventBase } from './event-base.js';

export const createSessionEndEvent = (
	session: TelemetrySession,
	data: SessionEndEventData,
): { event: SessionEndEvent; session: TelemetrySession } => {
	const { base, session: updatedSession } = createEventBase(session, 'session-end');
	const now = globalThis.performance?.now() ?? Date.now();
	const durationMs = (session.endTimestamp ?? now) - session.startTimestamp;
	return {
		event: {
			...base,
			totalRenders: data.totalRenders,
			durationMs,
			finalScore: data.finalScore ?? null,
		},
		session: updatedSession,
	};
};
