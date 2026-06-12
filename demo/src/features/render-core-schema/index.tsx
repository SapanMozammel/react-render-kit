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

const BADGE_OK = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-ok bg-ok-dim';

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
		<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
			<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
				<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">Type guard playground</span>
			</div>
			<div className="p-4 flex flex-col gap-4 text-xs">
				<div className="flex flex-col gap-1.5">
					<label className="text-[11px] text-dim">Input value (string)</label>
					<input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Type a value to test..."
						className="w-full px-3 py-2 bg-raised border border-edge rounded-md text-ink text-[13px] outline-none transition-colors focus:border-brand font-mono"
					/>
				</div>

				<div className="flex flex-col gap-1">
					{results.map((r) => (
						<div
							key={r.name}
							className={`border-b border-edge py-2 last:border-b-0 pl-2 border-l-2 ${r.result ? 'border-l-ok' : 'border-l-edge'}`}
						>
							<div className="flex items-center justify-between">
								<span className="text-ink font-mono text-xs">
									{r.name}(
									<span className="text-brand">&quot;{input}&quot;</span>)
								</span>
								<span className={r.result ? BADGE_OK : 'text-[10px] font-semibold px-1.5 py-px rounded-full text-muted bg-elevated'}>
									{r.result ? 'true ✓' : 'false'}
								</span>
							</div>
							{r.result && (
								<div className="flex gap-3 py-px mt-0.5">
									<span className="text-muted min-w-20 shrink-0">narrows to</span>
									<span className="text-ok font-mono break-all">{r.typeName}</span>
								</div>
							)}
						</div>
					))}
				</div>

				{matching.length === 0 && (
					<div className="py-4 text-center text-dim text-xs flex flex-col gap-1">
						<span>No type matched &quot;{input}&quot;</span>
						<span className="text-[11px] opacity-70">
							Try: 1.0.0 · render · EXCELLENT · HIGH · genuine · props · no-prop-change
						</span>
					</div>
				)}
			</div>
		</div>
	);
};

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
		<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
			<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
				<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">Version comparison utilities</span>
				<span className={`${BADGE_OK} text-[0.7rem]`}>CURRENT: {CURRENT_SCHEMA_VERSION}</span>
			</div>
			<div className="p-4 flex flex-col gap-4 text-xs">
				<div className="flex gap-4">
					{([['Version A', vA, setVA] as const, ['Version B (minimum)', vB, setVB] as const]).map(([label, val, setter]) => (
						<div key={label} className="flex-1 flex flex-col gap-1.5">
							<label className="text-[11px] text-dim">{label}</label>
							<input
								value={val}
								onChange={(e) => setter(e.target.value)}
								className={`w-full px-3 py-2 bg-raised border rounded-md text-ink text-[13px] outline-none transition-colors font-mono ${
									isSchemaVersion(val) ? 'border-ok' : 'border-warn'
								}`}
							/>
							{!isSchemaVersion(val) && (
								<span className="text-[11px] text-warn">invalid — use x.y.z</span>
							)}
						</div>
					))}
				</div>

				<div className="flex flex-col gap-2">
					<div className="border-b border-edge py-2 last:border-b-0">
						<div className="flex items-center justify-between mb-1">
							<span className="text-ink font-mono text-xs">compareSchemaVersions(a, b)</span>
							<span className={comparison !== null ? BADGE_OK : 'text-[10px] font-semibold px-1.5 py-px rounded-full text-muted bg-elevated'}>
								{comparison === null ? '—' : String(comparison)}
							</span>
						</div>
						<div className="flex gap-3 py-px pl-2 border-l-2 border-ok">
							<span className="text-ok break-all">{compLabel}</span>
						</div>
					</div>

					<div className="border-b border-edge py-2 last:border-b-0">
						<div className="flex items-center justify-between mb-1">
							<span className="text-ink font-mono text-xs">isSchemaVersionAtLeast(a, b)</span>
							<span className={atLeast === true ? BADGE_OK : atLeast === false ? 'text-[10px] font-semibold px-1.5 py-px rounded-full text-warn bg-warn-dim' : 'text-[10px] font-semibold px-1.5 py-px rounded-full text-muted bg-elevated'}>
								{atLeast === null ? '—' : String(atLeast)}
							</span>
						</div>
						{atLeast !== null && (
							<div className="flex gap-3 py-px pl-2 border-l-2 border-ok">
								<span className="text-ok break-all">
									{atLeast
										? `"${vA}" meets minimum requirement "${vB}"`
										: `"${vA}" is below minimum "${vB}" — migration required`}
								</span>
							</div>
						)}
					</div>
				</div>

				<details className="border border-edge rounded-[10px] overflow-hidden group">
					<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
						<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
						Typical usage
					</summary>
					<div className="p-3.5 flex flex-col gap-2.5">
						<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import {
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
	);
};

const FieldTable = ({ fields }: { fields: readonly FieldRow[] }) => (
	<table className="w-full border-collapse text-[0.8rem]">
		<thead>
			<tr className="border-b border-edge">
				{(['field', 'type', 'note'] as const).map((h) => (
					<th key={h} className="text-left px-2 py-1 text-muted font-medium">{h}</th>
				))}
			</tr>
		</thead>
		<tbody>
			{fields.map((f, i) => (
				<tr key={`${f.field}-${i}`} className="border-b border-edge last:border-b-0">
					<td className="px-2 py-1 font-mono text-brand">{f.field}</td>
					<td className="px-2 py-1 font-mono text-ok">{f.type}</td>
					<td className="px-2 py-1 text-muted text-[0.75rem]">{f.note ?? ''}</td>
				</tr>
			))}
		</tbody>
	</table>
);

const EventSchema = () => {
	const [active, setActive] = useState('RenderEvent');

	const entry = EVENT_ENTRIES.find((e) => e.name === active) ?? EVENT_ENTRIES[0]!;

	return (
		<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
			<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
				<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">TelemetryEvent union — {EVENT_ENTRIES.length} variants</span>
			</div>
			<div className="p-4 flex flex-col gap-4 text-xs">
				<div className="flex flex-wrap gap-1.5">
					{EVENT_ENTRIES.map((e) => (
						<button
							key={e.name}
							onClick={() => setActive(e.name)}
							className={`px-2 py-1 rounded text-xs font-mono border cursor-pointer transition-colors ${
								active === e.name
									? 'border-edge bg-elevated text-brand'
									: 'border-edge bg-transparent text-muted hover:text-ink hover:border-edge-active'
							}`}
						>
							{e.name}
						</button>
					))}
				</div>

				<div className="border border-edge rounded-md overflow-hidden">
					<div className="flex items-center justify-between px-3 py-2 border-b border-edge bg-raised">
						<span className="text-ink font-mono text-xs font-semibold">{entry.name}</span>
						<span className={BADGE_OK}>{entry.fields.length} fields (incl. base)</span>
					</div>
					<FieldTable fields={entry.fields} />
				</div>

				<p className="text-[11px] text-dim leading-[1.6]">
					All events extend <code>EventBase</code> via intersection. The <code>type</code> discriminant narrows
					the union — TypeScript exhaustiveness checks work automatically.
				</p>
			</div>
		</div>
	);
};

const ReplaySchema = () => {
	const [active, setActive] = useState(0);
	const section = REPLAY_SECTIONS[active]!;

	return (
		<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
			<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
				<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">Replay type hierarchy</span>
			</div>
			<div className="p-4 flex flex-col gap-4 text-xs">
				<div className="flex flex-col gap-1">
					{REPLAY_SECTIONS.map((s, i) => (
						<button
							key={i}
							onClick={() => setActive(i)}
							className={`px-3 py-1.5 rounded text-xs border cursor-pointer text-left transition-colors ${
								active === i
									? 'border-edge bg-elevated text-brand'
									: 'border-edge bg-transparent text-muted hover:text-ink hover:border-edge-active'
							}`}
						>
							{s.title}
						</button>
					))}
				</div>

				<div className="border border-edge rounded-md p-3">
					<pre className="text-ok text-[0.78rem] leading-[1.6] whitespace-pre-wrap">
						{section.shape}
					</pre>
				</div>

				<p className="text-[11px] text-dim leading-[1.6]">
					All fields are <code>readonly</code>. Types are structural — any compatible implementation
					satisfies the contract without importing from this package.
				</p>
			</div>
		</div>
	);
};

type ScenarioTabsProps = { active: ScenarioId; onChange: (id: ScenarioId) => void };

const ScenarioTabs = ({ active, onChange }: ScenarioTabsProps) => (
	<div className="flex gap-1.5 flex-wrap mb-5" role="tablist">
		{SCENARIOS.map((s) => (
			<button
				key={s.id}
				role="tab"
				className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
					active === s.id
						? 'border-brand bg-brand-dim text-brand'
						: 'border-edge bg-raised text-muted hover:border-edge-active hover:text-ink'
				}`}
				aria-selected={active === s.id}
				onClick={() => onChange(s.id)}
			>
				<span className={s.badge === 'ok' ? 'text-ok' : 'text-muted'}>
					{s.badge === 'ok' ? '✓' : 'ⓘ'}
				</span>
				{s.label}
			</button>
		))}
	</div>
);

export const RenderCoreSchemaDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('type-guards');
	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	return (
		<>
			<ScenarioTabs active={activeId} onChange={setActiveId} />

			<div className="mb-5 flex flex-col gap-2.5">
				<span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.75 rounded-full border w-fit ${
					activeScenario.badge === 'ok'
						? 'border-ok-dim bg-ok-dim text-ok'
						: 'border-edge bg-elevated text-muted'
				}`}>
					{activeScenario.badge === 'ok' ? '✓ utility' : 'ⓘ reference'}
				</span>
				<p className="text-[13px] text-muted max-w-150 leading-[1.7]">{activeScenario.description}</p>
			</div>

			{activeId === 'type-guards' && <TypeGuardPlayground />}
			{activeId === 'version-utils' && <VersionUtils />}
			{activeId === 'event-schema' && <EventSchema />}
			{activeId === 'replay-schema' && <ReplaySchema />}

			<details className="border border-edge rounded-[10px] overflow-hidden group mt-2">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					How to use render-core-schema
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import type {
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
					<p className="text-xs text-dim leading-[1.6]">
						Zero runtime dependencies. No React peer dep. Safe to import in Node.js workers, serverless
						functions, CLI tools, and browser contexts alike.
					</p>
				</div>
			</details>
		</>
	);
};
