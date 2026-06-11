import {
	createTelemetrySession,
	endTelemetrySession,
	registerTransport,
	serializeBuffer,
} from '@sapanmozammel/render-telemetry-core';
import type {
	TelemetryBuffer,
	TelemetryBufferSnapshot,
	TelemetryEvent,
	TelemetrySession,
	TelemetryTransport,
} from '@sapanmozammel/render-telemetry-core';
import type { ResolvedRenderKitConfig, RenderKitTelemetry } from '../types/index.js';

// Shared static snapshot returned by the disabled buffer
const DISABLED_SNAPSHOT: TelemetryBufferSnapshot = Object.freeze({
	events: Object.freeze([]) as readonly TelemetryEvent[],
	sessions: Object.freeze({}) as Readonly<Record<string, TelemetrySession>>,
});

// Single frozen instance shared across all disabled kits — zero allocation per disabled kit
const DISABLED_BUFFER: TelemetryBuffer = Object.freeze({
	subscribe: (_listener: () => void) => () => undefined,
	getSnapshot: () => DISABLED_SNAPSHOT,
	getServerSnapshot: () => DISABLED_SNAPSHOT,
	push: (_event: TelemetryEvent) => undefined,
	pushSession: (_session: TelemetrySession) => undefined,
	updateSession: (_session: TelemetrySession) => undefined,
	clear: () => undefined,
	getEventsBySession: (_sessionId: string) => Object.freeze([]) as readonly TelemetryEvent[],
	getEventsByComponent: (_componentName: string) => Object.freeze([]) as readonly TelemetryEvent[],
	getEventsByType: <T extends TelemetryEvent['type']>(
		_type: T,
	) => Object.freeze([]) as readonly Extract<TelemetryEvent, { type: T }>[],
	getSession: (_sessionId: string) => undefined,
	getSessionsByComponent: (_componentName: string) => Object.freeze([]) as readonly TelemetrySession[],
});

export { DISABLED_BUFFER };

export const createTelemetrySubsystem = (
	config: ResolvedRenderKitConfig['telemetry'],
	buffer: TelemetryBuffer,
	deregFns: Array<() => void>,
): RenderKitTelemetry => {
	const registerKit = (transport: TelemetryTransport): (() => void) => {
		const deregFn = registerTransport(transport);
		deregFns.push(deregFn);
		return deregFn;
	};

	const unregisterAll = (): void => {
		deregFns.forEach((fn) => fn());
		deregFns.length = 0;
	};

	return Object.freeze({
		enabled: config.enabled,
		buffer,
		createSession: (componentName: string): TelemetrySession =>
			createTelemetrySession(componentName),
		endSession: (session: TelemetrySession): TelemetrySession => endTelemetrySession(session),
		registerTransport: registerKit,
		unregisterAllTransports: unregisterAll,
		snapshot: (): TelemetryBufferSnapshot => buffer.getSnapshot(),
		serialize: (): string => serializeBuffer(buffer),
		clear: (): void => buffer.clear(),
	});
};

export const createDisabledTelemetry = (): RenderKitTelemetry =>
	Object.freeze({
		enabled: false,
		buffer: DISABLED_BUFFER,
		createSession: (componentName: string): TelemetrySession =>
			Object.freeze({
				id: 'disabled',
				componentName,
				startTimestamp: 0,
				startWallTimestamp: 0,
				endTimestamp: null,
				endWallTimestamp: null,
				status: 'active' as const,
				sequenceCounter: 0,
			}),
		endSession: (session: TelemetrySession): TelemetrySession =>
			Object.freeze({ ...session, status: 'ended' as const }),
		registerTransport: (_transport: TelemetryTransport): (() => void) => () => undefined,
		unregisterAllTransports: (): void => undefined,
		snapshot: (): TelemetryBufferSnapshot => DISABLED_SNAPSHOT,
		serialize: (): string => JSON.stringify({ events: [], sessions: {} }),
		clear: (): void => undefined,
	});
