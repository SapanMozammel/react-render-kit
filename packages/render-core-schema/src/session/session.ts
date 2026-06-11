import type { TelemetryEvent } from '../events/event-variants.js';
import type { SessionId } from '../identity/component-identity.js';

export type SessionStatus = 'active' | 'ended';

export type RenderSession = {
	readonly id: SessionId;
	readonly componentName: string;
	readonly startTimestamp: number;
	readonly startWallTimestamp: number;
	readonly endTimestamp: number | null;
	readonly endWallTimestamp: number | null;
	readonly status: SessionStatus;
};

export type TelemetrySnapshot = {
	readonly events: readonly TelemetryEvent[];
	readonly sessions: Readonly<Record<string, RenderSession>>;
};
