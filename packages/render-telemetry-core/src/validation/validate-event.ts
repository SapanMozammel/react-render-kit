import type { TelemetryEvent, TelemetryEventType } from '../types/index.js';
import { EVENT_SCHEMA_VERSIONS } from '../constants/schema-versions.js';

export const isKnownEventType = (type: unknown): type is TelemetryEventType => typeof type === 'string' && type in EVENT_SCHEMA_VERSIONS;

const hasBase = (v: Record<string, unknown>): boolean => {
	if (typeof v['id'] !== 'string') return false;
	if (typeof v['schemaVersion'] !== 'string') return false;
	if (typeof v['sessionId'] !== 'string') return false;
	if (typeof v['componentName'] !== 'string') return false;
	if (typeof v['sequenceNumber'] !== 'number' || v['sequenceNumber'] < 1) return false;
	if (typeof v['timestamp'] !== 'number') return false;
	if (typeof v['wallTimestamp'] !== 'number') return false;
	return true;
};

export const validateEvent = (value: unknown): value is TelemetryEvent => {
	if (value === null || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	if (!isKnownEventType(v['type'])) return false;
	if (!hasBase(v)) return false;

	switch (v['type']) {
		case 'session-start':
			return true;
		case 'render':
			return typeof v['renderNumber'] === 'number' && typeof v['triggeredBy'] === 'string';
		case 'prop-change':
			return typeof v['renderNumber'] === 'number' && Array.isArray(v['changed']) && Array.isArray(v['unstable']) && typeof v['inferredTrigger'] === 'string' && typeof v['signalKind'] === 'string';
		case 'frequency':
			return (
				typeof v['renderNumber'] === 'number' &&
				typeof v['windowMs'] === 'number' &&
				typeof v['windowCount'] === 'number' &&
				typeof v['rate'] === 'number' &&
				typeof v['classification'] === 'string' &&
				typeof v['totalRenders'] === 'number'
			);
		case 'score':
			return (
				typeof v['renderNumber'] === 'number' &&
				typeof v['score'] === 'number' &&
				typeof v['grade'] === 'string' &&
				typeof v['frequencyPenalty'] === 'number' &&
				typeof v['instabilityPenalty'] === 'number' &&
				typeof v['memoPenalty'] === 'number' &&
				typeof v['mixedSignalPenalty'] === 'number' &&
				typeof v['memoClassification'] === 'string' &&
				(typeof v['signalKind'] === 'string' || v['signalKind'] === null)
			);
		case 'recommendation':
			return typeof v['renderNumber'] === 'number' && Array.isArray(v['recommendations']);
		case 'session-end':
			return typeof v['totalRenders'] === 'number' && typeof v['durationMs'] === 'number' && (typeof v['finalScore'] === 'number' || v['finalScore'] === null);
		default:
			return false;
	}
};
