import type { TelemetryTransport, TransportEmitFn } from '../types/index.js';

export const createCustomTransport = (name: string, emit: TransportEmitFn): TelemetryTransport => ({
	name,
	emit,
});
