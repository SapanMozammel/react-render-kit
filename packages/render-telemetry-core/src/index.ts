// ── Types ─────────────────────────────────────────────────────────────────────
export type {
	SchemaVersion,
	TelemetryEventType,
	TelemetryEventBase,
	SessionStartEvent,
	RenderEvent,
	PropChangeEvent,
	FrequencyEvent,
	ScoreEvent,
	RecommendationEvent,
	SessionEndEvent,
	TelemetryEvent,
	SessionStatus,
	TelemetrySession,
	TelemetryBufferSnapshot,
	TelemetryBuffer,
	TelemetryBufferOptions,
	TelemetryTransport,
	TransportEmitFn,
	MemoryTransport,
	TelemetryPropChangeKind,
	TelemetryPropRefType,
	TelemetryPropChangeEntry,
	TelemetryPropInstability,
	TelemetryInferredTrigger,
	TelemetryRenderTrigger,
	TelemetryFrequencyClass,
	TelemetryHealthGrade,
	TelemetryMemoClassification,
	TelemetrySignalKind,
	RenderEventData,
	PropChangeEventData,
	FrequencyEventData,
	ScoreEventData,
	RecommendationEventData,
	SessionEndEventData,
	LocalStorageTransportOptions,
} from './types/index.js';

// ── Constants ─────────────────────────────────────────────────────────────────
export { CURRENT_SCHEMA_VERSION, EVENT_SCHEMA_VERSIONS } from './constants/schema-versions.js';

// ── Session ───────────────────────────────────────────────────────────────────
export { createTelemetrySession, endTelemetrySession } from './session/session.js';

// ── Event Factories ───────────────────────────────────────────────────────────
export { createSessionStartEvent } from './events/session-start-event.js';
export { createRenderEvent } from './events/render-event.js';
export { createPropChangeEvent } from './events/prop-change-event.js';
export { createFrequencyEvent } from './events/frequency-event.js';
export { createScoreEvent } from './events/score-event.js';
export { createRecommendationEvent } from './events/recommendation-event.js';
export { createSessionEndEvent } from './events/session-end-event.js';

// ── Buffer ────────────────────────────────────────────────────────────────────
export { createTelemetryBuffer } from './buffer/buffer.js';

// ── Transport Registry ────────────────────────────────────────────────────────
export {
	registerTransport,
	unregisterAllTransports,
	emitEvents,
} from './transport/registry.js';

// ── Transport Factories ───────────────────────────────────────────────────────
export { createMemoryTransport } from './transport/memory-transport.js';
export { createLocalStorageTransport } from './transport/local-storage-transport.js';
export { createCustomTransport } from './transport/custom-transport.js';

// ── Serialization ─────────────────────────────────────────────────────────────
export {
	serializeSession,
	deserializeSession,
	serializeBuffer,
	deserializeBuffer,
} from './serialization/serialize.js';

// ── Validation ────────────────────────────────────────────────────────────────
export { validateEvent, isKnownEventType } from './validation/validate-event.js';
