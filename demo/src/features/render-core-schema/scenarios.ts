export type ScenarioId = 'type-guards' | 'version-utils' | 'event-schema' | 'replay-schema';

export type ScenarioBadge = 'ok' | 'info';

export type Scenario = {
	readonly id: ScenarioId;
	readonly label: string;
	readonly description: string;
	readonly badge: ScenarioBadge;
};

export const SCENARIOS: readonly Scenario[] = [
	{
		id: 'type-guards',
		label: 'Type Guards',
		description:
			'Live type-guard playground. Type any value and see which canonical schema types it matches. Useful for validating incoming data at system boundaries — API responses, localStorage reads, WebSocket payloads.',
		badge: 'ok',
	},
	{
		id: 'version-utils',
		label: 'Version Utilities',
		description:
			'compareSchemaVersions and isSchemaVersionAtLeast in action. Use these when reading persisted telemetry to decide whether to migrate, skip, or reject a payload based on the schemaVersion field it carries.',
		badge: 'ok',
	},
	{
		id: 'event-schema',
		label: 'Event Schema',
		description:
			'Browse every event variant in the TelemetryEvent union. Each event carries a schemaVersion, sessionId, sequenceNumber, and wallTimestamp in addition to its own fields. These are the canonical shapes all packages in the ecosystem emit.',
		badge: 'info',
	},
	{
		id: 'replay-schema',
		label: 'Replay Schema',
		description:
			'Explore the replay engine type hierarchy — from ReplaySource down to ReplayFrame, ReplaySession, ReplayCursor, ReplayFilter, and ReplayBookmark. All types here are the single source of truth for render-replay-engine.',
		badge: 'info',
	},
];
