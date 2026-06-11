import type {
	TelemetryBuffer,
	TelemetryBufferOptions,
	TelemetrySession,
} from '../types/index.js';
import { CURRENT_SCHEMA_VERSION } from '../constants/schema-versions.js';
import { createTelemetryBuffer } from '../buffer/buffer.js';
import { validateEvent } from '../validation/validate-event.js';

export const isValidSession = (value: unknown): value is TelemetrySession => {
	if (value === null || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	if (typeof v['id'] !== 'string' || v['id'].length === 0) return false;
	if (typeof v['componentName'] !== 'string') return false;
	if (v['status'] !== 'active' && v['status'] !== 'ended') return false;
	if (typeof v['sequenceCounter'] !== 'number') return false;
	if (typeof v['startTimestamp'] !== 'number') return false;
	if (typeof v['startWallTimestamp'] !== 'number') return false;
	return true;
};

export const serializeSession = (session: TelemetrySession): string => JSON.stringify(session);

export const deserializeSession = (json: string): TelemetrySession | null => {
	try {
		const parsed: unknown = JSON.parse(json);
		if (!isValidSession(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
};

export const serializeBuffer = (buffer: TelemetryBuffer): string => {
	const snap = buffer.getSnapshot();
	return JSON.stringify({
		schemaVersion: CURRENT_SCHEMA_VERSION,
		exportedAt: Date.now(),
		events: [...snap.events],
		sessions: snap.sessions,
	});
};

export const deserializeBuffer = (
	json: string,
	options?: TelemetryBufferOptions,
): TelemetryBuffer => {
	try {
		const parsed = JSON.parse(json) as Record<string, unknown>;

		if (
			parsed === null ||
			typeof parsed !== 'object' ||
			!Array.isArray(parsed['events']) ||
			typeof parsed['sessions'] !== 'object' ||
			parsed['sessions'] === null
		) {
			console.warn('[render-telemetry-core] deserializeBuffer: invalid format');
			return createTelemetryBuffer(options);
		}

		if (parsed['schemaVersion'] !== CURRENT_SCHEMA_VERSION) {
			console.warn(
				'[render-telemetry-core] deserializeBuffer: unknown schemaVersion:',
				parsed['schemaVersion'],
			);
		}

		const validEvents = (parsed['events'] as unknown[]).filter(validateEvent);
		const validSessions = Object.values(
			parsed['sessions'] as Record<string, unknown>,
		).filter(isValidSession);

		const buffer = createTelemetryBuffer(options);
		validEvents.forEach((e) => buffer.push(e));
		validSessions.forEach((s) => buffer.pushSession(s));
		return buffer;
	} catch {
		console.warn('[render-telemetry-core] deserializeBuffer: failed to parse JSON');
		return createTelemetryBuffer(options);
	}
};
