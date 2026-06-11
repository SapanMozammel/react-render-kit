import type { TelemetryEvent } from '@sapanmozammel/render-telemetry-core';
import type { ReplayEventsSource } from '../types/index.js';

export const fromEvents = (events: readonly TelemetryEvent[]): ReplayEventsSource => ({
	type: 'events',
	events,
});
