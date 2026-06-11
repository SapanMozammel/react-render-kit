import type {
	TelemetryBuffer,
	TelemetryBufferOptions,
	TelemetryBufferSnapshot,
	TelemetryEvent,
	TelemetryEventType,
	TelemetrySession,
} from '../types/index.js';

const SERVER_SNAPSHOT: TelemetryBufferSnapshot = Object.freeze({
	events: Object.freeze([]) as readonly TelemetryEvent[],
	sessions: Object.freeze({}) as Readonly<Record<string, TelemetrySession>>,
});

export const createTelemetryBuffer = (options?: TelemetryBufferOptions): TelemetryBuffer => {
	const rawMax = options?.maxEvents;
	if (rawMax !== undefined && rawMax < 1) {
		console.warn('[render-telemetry-core] maxEvents clamped to 1');
	}
	const maxEvents = Math.max(1, rawMax ?? 1000);

	let snapshot: TelemetryBufferSnapshot = SERVER_SNAPSHOT;
	const listeners = new Set<() => void>();

	const notify = (): void => {
		listeners.forEach((l) => l());
	};

	return {
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		getSnapshot: () => snapshot,

		getServerSnapshot: () => SERVER_SNAPSHOT,

		push: (event) => {
			const events = [...snapshot.events, event];
			snapshot = {
				events: events.length > maxEvents ? events.slice(-maxEvents) : events,
				sessions: snapshot.sessions,
			};
			notify();
		},

		pushSession: (session) => {
			snapshot = {
				events: snapshot.events,
				sessions: { ...snapshot.sessions, [session.id]: session },
			};
			notify();
		},

		updateSession: (session) => {
			snapshot = {
				events: snapshot.events,
				sessions: { ...snapshot.sessions, [session.id]: session },
			};
			notify();
		},

		clear: () => {
			snapshot = SERVER_SNAPSHOT;
			notify();
		},

		getEventsBySession: (sessionId) =>
			snapshot.events.filter((e) => e.sessionId === sessionId),

		getEventsByComponent: (componentName) =>
			snapshot.events.filter((e) => e.componentName === componentName),

		getEventsByType: <T extends TelemetryEventType>(type: T) =>
			(snapshot.events.filter((e) => e.type === type) as unknown) as readonly Extract<
				TelemetryEvent,
				{ type: T }
			>[],

		getSession: (sessionId) => snapshot.sessions[sessionId],

		getSessionsByComponent: (componentName) =>
			Object.values(snapshot.sessions).filter((s) => s.componentName === componentName),
	};
};
