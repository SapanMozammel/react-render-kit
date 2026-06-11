import type { TelemetryEvent } from '../events/event-variants.js';

export type TransportEmitFn = (events: ReadonlyArray<TelemetryEvent>) => void;

export type TelemetryTransport = {
	readonly name: string;
	emit: TransportEmitFn;
	flush?: () => void;
	dispose?: () => void;
};
