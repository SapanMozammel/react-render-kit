import type { TelemetrySession } from '../types/index.js';
import { generateId } from '../utils/generate-id.js';

export const createTelemetrySession = (componentName: string): TelemetrySession => ({
	id: generateId(),
	componentName,
	startTimestamp: globalThis.performance?.now() ?? Date.now(),
	startWallTimestamp: Date.now(),
	endTimestamp: null,
	endWallTimestamp: null,
	status: 'active',
	sequenceCounter: 0,
});

export const endTelemetrySession = (session: TelemetrySession): TelemetrySession => {
	if (session.status === 'ended') {
		console.warn('[render-telemetry-core] endTelemetrySession called on already-ended session');
		return session;
	}
	return {
		...session,
		status: 'ended',
		endTimestamp: globalThis.performance?.now() ?? Date.now(),
		endWallTimestamp: Date.now(),
	};
};
