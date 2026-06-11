import type { TelemetryEvent, TelemetryTransport } from '../types/index.js';

const registry = new Set<TelemetryTransport>();

export const registerTransport = (transport: TelemetryTransport): (() => void) => {
	registry.add(transport);
	return () => {
		registry.delete(transport);
	};
};

export const unregisterAllTransports = (): void => {
	registry.clear();
};

export const emitEvents = (events: ReadonlyArray<TelemetryEvent>): void => {
	registry.forEach((transport) => {
		try {
			transport.emit(events);
		} catch {
			if (process.env.NODE_ENV === 'development') {
				console.warn(`[render-telemetry-core] transport "${transport.name}" emit() threw`, );
			}
		}
	});
};
