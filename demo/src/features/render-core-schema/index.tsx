'use client';

import { useState } from 'react';
import {
	isSchemaVersion,
	isEventType,
	isHealthGrade,
	isFrequencyClass,
	isMemoClassification,
	isSignalKind,
	isRenderTrigger,
	isInferredTrigger,
	compareSchemaVersions,
	isSchemaVersionAtLeast,
	CURRENT_SCHEMA_VERSION,
} from '@sapanmozammel/render-core-schema';
import type { SchemaVersion } from '@sapanmozammel/render-core-schema';
import { SCENARIOS, type ScenarioId, type Scenario } from './scenarios';

// ── Guard definitions ──────────────────────────────────────────────────────────

type GuardEntry = {
	readonly name: string;
	readonly typeName: string;
	readonly check: (v: unknown) => boolean;
	readonly validExamples: readonly string[];
};

const GUARDS: readonly GuardEntry[] = [
	{
		name: 'isSchemaVersion',
		typeName: 'SchemaVersion',
		check: isSchemaVersion,
		validExamples: ['1.0.0', '2.3.1', '0.0.1'],
	},
	{
		name: 'isEventType',
		typeName: 'EventType',
		check: isEventType,
		validExamples: ['render', 'prop-change', 'score', 'session-start', 'session-end'],
	},
	{
		name: 'isHealthGrade',
		typeName: 'HealthGrade',
		check: isHealthGrade,
		validExamples: ['EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'CRITICAL'],
	},
	{
		name: 'isFrequencyClass',
		typeName: 'FrequencyClass',
		check: isFrequencyClass,
		validExamples: ['LOW', 'MODERATE', 'HIGH', 'NOT_ENOUGH_DATA'],
	},
	{
		name: 'isMemoClassification',
		typeName: 'MemoClassification',
		check: isMemoClassification,
		validExamples: ['EFFECTIVE', 'INEFFECTIVE', 'PARTIALLY_EFFECTIVE', 'NOT_APPLICABLE'],
	},
	{
		name: 'isSignalKind',
		typeName: 'SignalKind',
		check: isSignalKind,
		validExamples: ['genuine', 'reference-only', 'mixed'],
	},
	{
		name: 'isRenderTrigger',
		typeName: 'RenderTrigger',
		check: isRenderTrigger,
		validExamples: ['props', 'state', 'context', 'parent', 'unknown'],
	},
	{
		name: 'isInferredTrigger',
		typeName: 'InferredTrigger',
		check: isInferredTrigger,
		validExamples: ['no-prop-change', 'genuine-prop-change', 'reference-instability', 'mixed'],
	},
];

// ── Event schema reference ────────────────────────────────────────────────────

type FieldRow = { field: string; type: string; note?: string };
type EventEntry = { name: string; fields: readonly FieldRow[] };

const BASE_FIELDS: readonly FieldRow[] = [
	{ field: 'id', type: 'string', note: 'UUID — unique per event' },
	{ field: 'type', type: 'EventType', note: 'discriminant' },
	{ field: 'schemaVersion', type: 'SchemaVersion', note: `e.g. "${CURRENT_SCHEMA_VERSION}"` },
	{ field: 'sessionId', type: 'SessionId', note: 'groups events into sessions' },
	{ field: 'componentName', type: 'string' },
	{ field: 'sequenceNumber', type: 'number', note: 'monotonic within a session' },
	{ field: 'timestamp', type: 'number', note: 'performance.now() — high precision' },
	{ field: 'wallTimestamp', type: 'number', note: 'Date.now() — calendar ms' },
];

const EVENT_ENTRIES: readonly EventEntry[] = [
	{
		name: 'SessionStartEvent',
		fields: [{ field: 'type', type: '"session-start"' }, ...BASE_FIELDS.slice(2)],
	},
	{
		name: 'RenderEvent',
		fields: [
			{ field: 'type', type: '"render"' },
			{ field: 'renderNumber', type: 'number', note: '1-based counter per session' },
			{ field: 'triggeredBy', type: 'RenderTrigger', note: 'props | state | context | parent | unknown' },
			...BASE_FIELDS.slice(2),
		],
	},
	{
		name: 'PropChangeEvent',
		fields: [
			{ field: 'type', type: '"prop-change"' },
			{ field: 'renderNumber', type: 'number' },
			{ field: 'changed', type: 'readonly PropChangeEntry[]' },
			{ field: 'unstable', type: 'readonly PropInstability[]' },
			{ field: 'inferredTrigger', type: 'InferredTrigger' },
			{ field: 'signalKind', type: 'SignalKind', note: 'per-render memo signal' },
			...BASE_FIELDS.slice(2),
		],
	},
	{
		name: 'ScoreEvent',
		fields: [
			{ field: 'type', type: '"score"' },
			{ field: 'renderNumber', type: 'number' },
			{ field: 'score', type: 'number', note: '0–100' },
			{ field: 'grade', type: 'HealthGrade' },
			{ field: 'frequencyPenalty', type: 'number' },
			{ field: 'instabilityPenalty', type: 'number' },
			{ field: 'memoPenalty', type: 'number' },
			{ field: 'mixedSignalPenalty', type: 'number' },
			{ field: 'memoClassification', type: 'MemoClassification', note: 'session-level' },
			{ field: 'signalKind', type: 'SignalKind | null', note: 'null when no prop change' },
			...BASE_FIELDS.slice(2),
		],
	},
	{
		name: 'SessionEndEvent',
		fields: [
			{ field: 'type', type: '"session-end"' },
			{ field: 'totalRenders', type: 'number' },
			{ field: 'durationMs', type: 'number' },
			{ field: 'finalScore', type: 'number | null' },
			...BASE_FIELDS.slice(2),
		],
	},
];

// ── Replay schema reference ───────────────────────────────────────────────────

type SchemaSection = { title: string; shape: string };

const REPLAY_SECTIONS: readonly SchemaSection[] = [
	{
		title: 'ReplaySource — three ways to load data',
		shape: `type ReplaySource =
  | { type: 'events'; events: readonly TelemetryEvent[] }
  | { type: 'buffer'; buffer: { getSnapshot: () => ... } }
  | { type: 'serialized'; json: string }`,
	},
	{
		title: 'ReplayFrame — one frame per render event',
		shape: `type ReplayFrame = {
  id: ReplayFrameId           // "\${sessionId}:\${frameIndex}"
  frameIndex: number
  renderNumber: number
  renderEvent: RenderEvent
  propChangeEvent: PropChangeEvent | null
  scoreEvent: ScoreEvent | null
  score: number | null
  grade: HealthGrade | null
  hasUnstableProps: boolean
  triggeredBy: 'parent' | 'props'
  ...
}`,
	},
	{
		title: 'ReplaySession — frames + stats + timeline',
		shape: `type ReplaySession = {
  id: ReplaySessionId
  frames: readonly ReplayFrame[]
  frameCount: number
  schemaVersion: SchemaVersion
  stats: ReplaySessionStats       // averageScore, scoreDelta, ...
  timeline: ReplayTimeline        // entries + trend segments
  pruningInfo: ReplayPruningInfo  // pruned | not pruned
}`,
	},
	{
		title: 'ReplayCursor — immutable navigation position',
		shape: `type ReplayCursor = {
  sessionId: ReplaySessionId
  frameIndex: number
  totalFrames: number
  isAtStart: boolean
  isAtEnd: boolean
  frame: ReplayFrame
}`,
	},
	{
		title: 'ReplayFilter — query frames declaratively',
		shape: `type ReplayFilter = {
  minScore?: number
  maxScore?: number
  grades?: readonly HealthGrade[]
  hasUnstablePropsOnly?: boolean
  triggeredBy?: readonly ('parent' | 'props')[]
  memoClassifications?: readonly MemoClassification[]
  ...
}

// 7 built-in presets:
type ReplayFilterPreset =
  | 'issues-only' | 'score-degradation'
  | 'reference-instability' | 'high-frequency'
  | 'ineffective-memo' | 'prop-changes-only'
  | 'parent-triggered-only'`,
	},
	{
		title: 'ReplayEngine — the main API surface',
		shape: `type ReplayEngine = {
  session: ReplaySession
  navigate: ReplayNavigator       // at / next / previous / seek / jumpToTimestamp
  bookmarks: ReplayBookmarkStore  // create / remove / update / export / import
  applyFilter(filter): ReplayFilterResult
  applyPreset(preset): ReplayFilterResult
  getFrame(index): ReplayFrame | null
  getFrameRange(start, end): readonly ReplayFrame[]
}`,
	},
];

// ── TypeGuardPlayground ────────────────────────────────────────────────────────

const TypeGuardPlayground = () => {
	const [input, setInput] = useState('1.0.0');

	const results = GUARDS.map((g) => ({
		name: g.name,
		typeName: g.typeName,
		result: g.check(input),
		validExamples: g.validExamples,
	}));

	const matching = results.filter((r) => r.result);

	return (
		<div className="demo-grid demo-grid--single">
			<div className="demo-pane">
				<div className="demo-pane__header">
					<span className="demo-pane__title">Type guard playground</span>
				</div>
				<div className="demo-pane__body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
						<label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #888)' }}>
							Input value (string)
						</label>
						<input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Type a value to test..."
							style={{
								padding: '0.5rem 0.75rem',
								background: 'var(--color-surface-2, #1e1e1e)',
								border: '1px solid var(--color-border, #333)',
								borderRadius: '4px',
								color: 'inherit',
								fontSize: '0.875rem',
								fontFamily: 'monospace',
								width: '100%',
							}}
						/>
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
						{results.map((r) => (
							<div
								key={r.name}
								className="console-entry"
								style={{ borderLeft: `3px solid ${r.result ? 'var(--color-ok, #22c55e)' : 'var(--color-border, #333)'}` }}
							>
								<div className="console-entry__header">
									<span className="console-entry__title" style={{ fontFamily: 'monospace' }}>
										{r.name}(
										<span style={{ color: 'var(--color-accent, #60a5fa)' }}>&quot;{input}&quot;</span>)
									</span>
									<span className={`console-entry__badge ${r.result ? 'console-entry__badge--ok' : ''}`}
										style={!r.result ? { background: 'var(--color-surface-3, #2a2a2a)', color: 'var(--color-text-muted, #888)' } : {}}>
										{r.result ? 'true ✓' : 'false'}
									</span>
								</div>
								{r.result && (
									<div className="console-section">
										<div className="console-section__line console-section__line--added">
											<span className="console-line__key">narrows to</span>
											<span className="console-line__added" style={{ fontFamily: 'monospace' }}>{r.typeName}</span>
										</div>
									</div>
								)}
							</div>
						))}
					</div>

					{matching.length === 0 && (
						<div className="console-panel__empty">
							<span>No type matched &quot;{input}&quot;</span>
							<span className="console-panel__empty-hint">
								Try: 1.0.0 · render · EXCELLENT · HIGH · genuine · props · no-prop-change
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

// ── VersionUtils ──────────────────────────────────────────────────────────────

const VersionUtils = () => {
	const [vA, setVA] = useState('1.2.0');
	const [vB, setVB] = useState('1.0.0');

	const aValid = isSchemaVersion(vA);
	const bValid = isSchemaVersion(vB);

	const comparison = aValid && bValid ? compareSchemaVersions(vA as SchemaVersion, vB as SchemaVersion) : null;
	const atLeast = aValid && bValid ? isSchemaVersionAtLeast(vA as SchemaVersion, vB as SchemaVersion) : null;

	const compLabel =
		comparison === null ? '—' : comparison === 1 ? `"${vA}" > "${vB}"` : comparison === -1 ? `"${vA}" < "${vB}"` : `"${vA}" === "${vB}"`;

	return (
		<div className="demo-grid demo-grid--single">
			<div className="demo-pane">
				<div className="demo-pane__header">
					<span className="demo-pane__title">Version comparison utilities</span>
					<span className="console-entry__badge console-entry__badge--ok" style={{ fontSize: '0.7rem' }}>
						CURRENT: {CURRENT_SCHEMA_VERSION}
					</span>
				</div>
				<div className="demo-pane__body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
					<div style={{ display: 'flex', gap: '1rem' }}>
						{([['Version A', vA, setVA] as const, ['Version B (minimum)', vB, setVB] as const]).map(([label, val, setter]) => (
							<div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
								<label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #888)' }}>{label}</label>
								<input
									value={val}
									onChange={(e) => setter(e.target.value)}
									style={{
										padding: '0.5rem 0.75rem',
										background: 'var(--color-surface-2, #1e1e1e)',
										border: `1px solid ${isSchemaVersion(val) ? 'var(--color-ok, #22c55e)' : 'var(--color-warn, #f59e0b)'}`,
										borderRadius: '4px',
										color: 'inherit',
										fontSize: '0.875rem',
										fontFamily: 'monospace',
									}}
								/>
								{!isSchemaVersion(val) && (
									<span style={{ fontSize: '0.7rem', color: 'var(--color-warn, #f59e0b)' }}>
										invalid — use x.y.z
									</span>
								)}
							</div>
						))}
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
						<div className="console-entry">
							<div className="console-entry__header">
								<span className="console-entry__title" style={{ fontFamily: 'monospace' }}>
									compareSchemaVersions(a, b)
								</span>
								<span className={`console-entry__badge ${comparison !== null ? 'console-entry__badge--ok' : ''}`}>
									{comparison === null ? '—' : String(comparison)}
								</span>
							</div>
							<div className="console-section">
								<div className="console-section__line console-section__line--added">
									<span className="console-line__added">{compLabel}</span>
								</div>
							</div>
						</div>

						<div className="console-entry">
							<div className="console-entry__header">
								<span className="console-entry__title" style={{ fontFamily: 'monospace' }}>
									isSchemaVersionAtLeast(a, b)
								</span>
								<span className={`console-entry__badge ${atLeast === true ? 'console-entry__badge--ok' : atLeast === false ? 'console-entry__badge--warn' : ''}`}>
									{atLeast === null ? '—' : String(atLeast)}
								</span>
							</div>
							{atLeast !== null && (
								<div className="console-section">
									<div className="console-section__line console-section__line--added">
										<span className="console-line__added">
											{atLeast
												? `"${vA}" meets minimum requirement "${vB}"`
												: `"${vA}" is below minimum "${vB}" — migration required`}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>

					<details className="code-hint" style={{ marginTop: '0.5rem' }}>
						<summary>Typical usage</summary>
						<div className="code-hint__body">
							<pre className="code-hint__pre">{`import {
  isSchemaVersion,
  isSchemaVersionAtLeast,
  CURRENT_SCHEMA_VERSION,
} from '@sapanmozammel/render-core-schema';

// When reading from localStorage / IndexedDB / API:
const raw = JSON.parse(stored);
if (!isSchemaVersion(raw.schemaVersion)) throw new Error('missing schema version');
if (!isSchemaVersionAtLeast(raw.schemaVersion, '1.0.0')) {
  return migrate(raw); // handle old payloads
}
// raw.schemaVersion is now narrowed to SchemaVersion`}</pre>
						</div>
					</details>
				</div>
			</div>
		</div>
	);
};

// ── EventSchema ───────────────────────────────────────────────────────────────

const FieldTable = ({ fields }: { fields: readonly FieldRow[] }) => (
	<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
		<thead>
			<tr style={{ borderBottom: '1px solid var(--color-border, #333)' }}>
				{(['field', 'type', 'note'] as const).map((h) => (
					<th key={h} style={{ textAlign: 'left', padding: '0.25rem 0.5rem', color: 'var(--color-text-muted, #888)', fontWeight: 500 }}>
						{h}
					</th>
				))}
			</tr>
		</thead>
		<tbody>
			{fields.map((f, i) => (
				<tr key={`${f.field}-${i}`} style={{ borderBottom: '1px solid var(--color-border-subtle, #222)' }}>
					<td style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace', color: 'var(--color-accent, #60a5fa)' }}>
						{f.field}
					</td>
					<td style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace', color: 'var(--color-ok, #86efac)' }}>
						{f.type}
					</td>
					<td style={{ padding: '0.25rem 0.5rem', color: 'var(--color-text-muted, #888)', fontSize: '0.75rem' }}>
						{f.note ?? ''}
					</td>
				</tr>
			))}
		</tbody>
	</table>
);

const EventSchema = () => {
	const [active, setActive] = useState('RenderEvent');

	const entry = EVENT_ENTRIES.find((e) => e.name === active) ?? EVENT_ENTRIES[0]!;

	return (
		<div className="demo-grid demo-grid--single">
			<div className="demo-pane">
				<div className="demo-pane__header">
					<span className="demo-pane__title">TelemetryEvent union — {EVENT_ENTRIES.length} variants</span>
				</div>
				<div className="demo-pane__body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
						{EVENT_ENTRIES.map((e) => (
							<button
								key={e.name}
								onClick={() => setActive(e.name)}
								style={{
									padding: '0.25rem 0.6rem',
									borderRadius: '4px',
									fontSize: '0.75rem',
									fontFamily: 'monospace',
									border: '1px solid var(--color-border, #333)',
									background: active === e.name ? 'var(--color-surface-3, #2a2a2a)' : 'transparent',
									color: active === e.name ? 'var(--color-accent, #60a5fa)' : 'inherit',
									cursor: 'pointer',
								}}
							>
								{e.name}
							</button>
						))}
					</div>

					<div className="console-entry" style={{ padding: 0 }}>
						<div className="console-entry__header" style={{ padding: '0.5rem 0.75rem' }}>
							<span className="console-entry__title" style={{ fontFamily: 'monospace' }}>{entry.name}</span>
							<span className="console-entry__badge console-entry__badge--ok">{entry.fields.length} fields (incl. base)</span>
						</div>
						<FieldTable fields={entry.fields} />
					</div>

					<p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #888)', margin: 0 }}>
						All events extend <code>EventBase</code> via intersection. The <code>type</code> discriminant narrows
						the union — TypeScript exhaustiveness checks work automatically.
					</p>
				</div>
			</div>
		</div>
	);
};

// ── ReplaySchema ──────────────────────────────────────────────────────────────

const ReplaySchema = () => {
	const [active, setActive] = useState(0);
	const section = REPLAY_SECTIONS[active]!;

	return (
		<div className="demo-grid demo-grid--single">
			<div className="demo-pane">
				<div className="demo-pane__header">
					<span className="demo-pane__title">Replay type hierarchy</span>
				</div>
				<div className="demo-pane__body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
						{REPLAY_SECTIONS.map((s, i) => (
							<button
								key={i}
								onClick={() => setActive(i)}
								style={{
									padding: '0.4rem 0.75rem',
									borderRadius: '4px',
									fontSize: '0.8rem',
									border: '1px solid var(--color-border, #333)',
									background: active === i ? 'var(--color-surface-3, #2a2a2a)' : 'transparent',
									color: active === i ? 'var(--color-accent, #60a5fa)' : 'inherit',
									cursor: 'pointer',
									textAlign: 'left',
								}}
							>
								{s.title}
							</button>
						))}
					</div>

					<div className="console-entry" style={{ padding: '0.75rem' }}>
						<pre style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--color-ok, #86efac)', whiteSpace: 'pre-wrap' }}>
							{section.shape}
						</pre>
					</div>

					<p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #888)', margin: 0 }}>
						All fields are <code>readonly</code>. Types are structural — any compatible implementation
						satisfies the contract without importing from this package.
					</p>
				</div>
			</div>
		</div>
	);
};

// ── ScenarioTabs ──────────────────────────────────────────────────────────────

type ScenarioTabsProps = { active: ScenarioId; onChange: (id: ScenarioId) => void };

const ScenarioTabs = ({ active, onChange }: ScenarioTabsProps) => (
	<div className="scenario-tabs" role="tablist">
		{SCENARIOS.map((s) => (
			<button
				key={s.id}
				role="tab"
				className={`scenario-tab scenario-tab--${s.badge}`}
				aria-selected={active === s.id}
				onClick={() => onChange(s.id)}
			>
				<span className={`scenario-tab__indicator scenario-tab__indicator--${s.badge}`}>
					{s.badge === 'ok' ? '✓' : 'i'}
				</span>
				{s.label}
			</button>
		))}
	</div>
);

// ── RenderCoreSchemaDemo ──────────────────────────────────────────────────────

export const RenderCoreSchemaDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('type-guards');
	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	return (
		<>
			<ScenarioTabs active={activeId} onChange={setActiveId} />

			<div className="scenario-header">
				<span className={`scenario-badge scenario-badge--${activeScenario.badge}`}>
					{activeScenario.badge === 'ok' ? '✓ utility' : 'ⓘ reference'}
				</span>
				<p className="scenario-description">{activeScenario.description}</p>
			</div>

			{activeId === 'type-guards' && <TypeGuardPlayground />}
			{activeId === 'version-utils' && <VersionUtils />}
			{activeId === 'event-schema' && <EventSchema />}
			{activeId === 'replay-schema' && <ReplaySchema />}

			<details className="code-hint code-hint--usage">
				<summary>How to use render-core-schema</summary>
				<div className="code-hint__body">
					<pre className="code-hint__pre">{`import type {
  TelemetryEvent, RenderEvent, PropChangeEvent, ScoreEvent,
  HealthGrade, MemoClassification, FrequencyClass, SignalKind,
  ReplayEngine, ReplayFrame, ReplayFilter, ReplayCursor,
  SchemaVersion,
} from '@sapanmozammel/render-core-schema';

import {
  CURRENT_SCHEMA_VERSION,
  isSchemaVersion,
  isHealthGrade,
  isEventType,
  compareSchemaVersions,
  isSchemaVersionAtLeast,
} from '@sapanmozammel/render-core-schema';

// Type-guard pattern for incoming payloads:
const parseEvent = (raw: unknown): TelemetryEvent | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const { type, schemaVersion } = raw as Record<string, unknown>;
  if (!isEventType(type)) return null;
  if (!isSchemaVersion(schemaVersion)) return null;
  if (!isSchemaVersionAtLeast(schemaVersion, '1.0.0')) return null;
  return raw as TelemetryEvent;
};

// Exhaustive narrowing — TypeScript enforces every branch:
const handleEvent = (event: TelemetryEvent): void => {
  switch (event.type) {
    case 'render':        return handleRender(event);   // RenderEvent
    case 'prop-change':   return handlePropChange(event);
    case 'score':         return handleScore(event);     // ScoreEvent
    case 'session-start': return handleStart(event);
    case 'session-end':   return handleEnd(event);
    case 'frequency':     return handleFrequency(event);
    case 'recommendation': return handleRec(event);
    // No default needed — TypeScript knows all cases are covered
  }
};`}</pre>
					<p className="code-hint__note">
						Zero runtime dependencies. No React peer dep. Safe to import in Node.js workers, serverless
						functions, CLI tools, and browser contexts alike.
					</p>
				</div>
			</details>
		</>
	);
};
