import type { PropChangeEvent, PropChangeEventData, TelemetrySession } from '../types/index.js';
import { createEventBase } from './event-base.js';

export const createPropChangeEvent = (
	session: TelemetrySession,
	data: PropChangeEventData,
): { event: PropChangeEvent; session: TelemetrySession } => {
	const { base, session: updatedSession } = createEventBase(session, 'prop-change');
	return {
		event: {
			...base,
			renderNumber: data.renderNumber,
			changed: data.changed,
			unstable: data.unstable,
			inferredTrigger: data.inferredTrigger,
			signalKind: data.signalKind,
		},
		session: updatedSession,
	};
};
