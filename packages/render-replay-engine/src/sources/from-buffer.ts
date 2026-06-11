import type { TelemetryBuffer } from '@sapanmozammel/render-telemetry-core';
import type { ReplayBufferSource } from '../types/index.js';

export const fromBuffer = (buffer: TelemetryBuffer): ReplayBufferSource => ({
	type: 'buffer',
	buffer,
});
