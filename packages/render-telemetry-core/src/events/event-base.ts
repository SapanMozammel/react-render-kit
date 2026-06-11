import type { TelemetryEventBase, TelemetryEventType, TelemetrySession } from '../types/index.js';
import { EVENT_SCHEMA_VERSIONS } from '../constants/schema-versions.js';
import { generateId } from '../utils/generate-id.js';

export type EventBaseResult<T extends TelemetryEventType> = {
	base: TelemetryEventBase & { type: T };
	session: TelemetrySession;
};

export const createEventBase = <T extends TelemetryEventType>(
	session: TelemetrySession,
	type: T,
): EventBaseResult<T> => {
	const newCounter = session.sequenceCounter + 1;
	const base = {
		id: generateId(),
		type,
		schemaVersion: EVENT_SCHEMA_VERSIONS[type],
		sessionId: session.id,
		componentName: session.componentName,
		sequenceNumber: newCounter,
		timestamp: globalThis.performance?.now() ?? Date.now(),
		wallTimestamp: Date.now(),
	} as TelemetryEventBase & { type: T };
	const updatedSession: TelemetrySession = { ...session, sequenceCounter: newCounter };
	return { base, session: updatedSession };
};
