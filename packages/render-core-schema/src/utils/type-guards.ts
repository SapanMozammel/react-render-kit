import type { SchemaVersion } from '../version/schema-version.js';
import type { EventType } from '../events/event-types.js';
import type { HealthGrade } from '../analysis/scoring.js';
import type { FrequencyClass } from '../analysis/frequency.js';
import type { MemoClassification, SignalKind } from '../analysis/memo.js';
import type { RenderTrigger, InferredTrigger } from '../lifecycle/render-lifecycle.js';

// Strict semver integers — no leading zeros (0 is valid, 01 is not).
const SCHEMA_VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export const isSchemaVersion = (v: unknown): v is SchemaVersion => typeof v === 'string' && SCHEMA_VERSION_RE.test(v);

const EVENT_TYPES = new Set<EventType>(['session-start', 'render', 'prop-change', 'frequency', 'score', 'recommendation', 'session-end']);

export const isEventType = (v: unknown): v is EventType => typeof v === 'string' && EVENT_TYPES.has(v as EventType);

const HEALTH_GRADES = new Set<HealthGrade>(['EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'CRITICAL']);

export const isHealthGrade = (v: unknown): v is HealthGrade => typeof v === 'string' && HEALTH_GRADES.has(v as HealthGrade);

const FREQUENCY_CLASSES = new Set<FrequencyClass>(['LOW', 'MODERATE', 'HIGH', 'NOT_ENOUGH_DATA']);

export const isFrequencyClass = (v: unknown): v is FrequencyClass => typeof v === 'string' && FREQUENCY_CLASSES.has(v as FrequencyClass);

const MEMO_CLASSIFICATIONS = new Set<MemoClassification>(['NOT_APPLICABLE', 'EFFECTIVE', 'INEFFECTIVE', 'PARTIALLY_EFFECTIVE']);

export const isMemoClassification = (v: unknown): v is MemoClassification => typeof v === 'string' && MEMO_CLASSIFICATIONS.has(v as MemoClassification);

const SIGNAL_KINDS = new Set<SignalKind>(['genuine', 'reference-only', 'mixed']);

export const isSignalKind = (v: unknown): v is SignalKind => typeof v === 'string' && SIGNAL_KINDS.has(v as SignalKind);

const RENDER_TRIGGERS = new Set<RenderTrigger>(['props', 'state', 'context', 'parent', 'unknown']);

export const isRenderTrigger = (v: unknown): v is RenderTrigger => typeof v === 'string' && RENDER_TRIGGERS.has(v as RenderTrigger);

const INFERRED_TRIGGERS = new Set<InferredTrigger>(['no-prop-change', 'genuine-prop-change', 'reference-instability', 'mixed']);

export const isInferredTrigger = (v: unknown): v is InferredTrigger => typeof v === 'string' && INFERRED_TRIGGERS.has(v as InferredTrigger);
