import type { SchemaVersion, TelemetryEventType } from '../types/index.js';

export const CURRENT_SCHEMA_VERSION: SchemaVersion = '1.0.0';

export const EVENT_SCHEMA_VERSIONS: Record<TelemetryEventType, SchemaVersion> = {
	'session-start': '1.0.0',
	render: '1.0.0',
	'prop-change': '1.0.0',
	frequency: '1.0.0',
	score: '1.0.0',
	recommendation: '1.0.0',
	'session-end': '1.0.0',
};
