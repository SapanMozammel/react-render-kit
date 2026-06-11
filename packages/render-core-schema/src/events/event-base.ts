import type { SchemaVersion } from '../version/schema-version.js';
import type { SessionId } from '../identity/component-identity.js';
import type { EventType } from './event-types.js';

export type EventBase = {
	readonly id: string;
	readonly type: EventType;
	readonly schemaVersion: SchemaVersion;
	readonly sessionId: SessionId;
	readonly componentName: string;
	readonly sequenceNumber: number;
	readonly timestamp: number;
	readonly wallTimestamp: number;
};
