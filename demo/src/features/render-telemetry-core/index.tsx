'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
	createTelemetryBuffer,
	createTelemetrySession,
	endTelemetrySession,
	createSessionStartEvent,
	createRenderEvent,
	createPropChangeEvent,
	createFrequencyEvent,
	createScoreEvent,
	createRecommendationEvent,
	createSessionEndEvent,
} from '@sapanmozammel/render-telemetry-core';
import type {
	TelemetryBuffer,
	TelemetrySession,
	TelemetryEvent,
	TelemetryPropChangeEntry,
	TelemetryPropInstability,
	TelemetryPropRefType,
	TelemetrySignalKind,
	TelemetryMemoClassification,
	TelemetryFrequencyClass,
	TelemetryHealthGrade,
} from '@sapanmozammel/render-telemetry-core';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

// ── Local types ────────────────────────────────────────────────

type DemoProps = {
	title: string;
	count: number;
	tags?: string[];
	onAction?: () => void;
};

type CaptureOptions = {
	ignoreProps?: string[];
	frequencyWindowMs?: number;
};

// ── Helpers ────────────────────────────────────────────────────

const isRefValue = (v: unknown): boolean =>
	typeof v === 'function' || Array.isArray(v) || (typeof v === 'object' && v !== null);

const inferRefType = (v: unknown): TelemetryPropRefType =>
	typeof v === 'function' ? 'function' : Array.isArray(v) ? 'array' : 'object';

const formatTime = (ts: number): string => new Date(ts).toTimeString().slice(0, 8);

// ── useTelemetryCapture ────────────────────────────────────────
// Side-effect-only hook — emits all 7 event types into the provided buffer.
// Computation runs in render body; push to buffer runs in useEffect.

const useTelemetryCapture = (
	componentName: string,
	props: Record<string, unknown>,
	buffer: TelemetryBuffer,
	options?: CaptureOptions,
): void => {
	const windowMs = options?.frequencyWindowMs ?? 10_000;
	const ignoreProps = options?.ignoreProps ?? [];

	const sessionRef = useRef<TelemetrySession | null>(null);
	const renderCountRef = useRef(0);
	const prevPropsRef = useRef<Record<string, unknown> | null>(null);
	const timestampsRef = useRef<number[]>([]);
	const signalWindowRef = useRef<TelemetrySignalKind[]>([]);
	const pendingEventsRef = useRef<TelemetryEvent[]>([]);
	const pendingSessionRef = useRef<TelemetrySession | null>(null);
	const hasStartedRef = useRef(false);
	const unmountedRef = useRef(false);

	// Flush pending events to buffer after every render.
	// No deps — must run after every render so every re-render emits events.
	// Safe because EventStreamPanel (not DemoTarget's parent) holds the subscription;
	// buffer.notify() only re-renders EventStreamPanel, not this component's ancestor tree.
	useEffect(() => {
		const events = pendingEventsRef.current;
		const finalSession = pendingSessionRef.current;
		if (events.length === 0) return;
		for (const ev of events) buffer.push(ev);
		if (finalSession) buffer.updateSession(finalSession);
		pendingEventsRef.current = [];
		pendingSessionRef.current = null;
	}); // intentionally no deps — runs after every render

	// Emit session-end on unmount
	useEffect(() => {
		unmountedRef.current = false;
		return () => {
			if (unmountedRef.current) return;
			unmountedRef.current = true;
			const s = sessionRef.current;
			if (!s) return;
			const ended = endTelemetrySession(s);
			const { event: endEv } = createSessionEndEvent(ended, {
				totalRenders: renderCountRef.current,
			});
			buffer.push(endEv);
			buffer.updateSession(ended);
		};
	}, [buffer]);

	// ── Synchronous render-body computation ───────────────────────
	// (Refs are updated in place; no hook rules violated — all hooks already declared above)

	const now = Date.now();
	renderCountRef.current += 1;
	const renderNumber = renderCountRef.current;

	// Init session on first render
	if (sessionRef.current === null) {
		sessionRef.current = createTelemetrySession(componentName);
	}

	// Frequency window
	timestampsRef.current.push(now);
	const windowStart = now - windowMs;
	while (timestampsRef.current.length > 0 && (timestampsRef.current[0] ?? 0) < windowStart) {
		timestampsRef.current.shift();
	}
	const windowCount = timestampsRef.current.length;
	const rate = windowCount >= 2 ? ((windowCount - 1) / windowMs) * 1000 : 0;
	const classification: TelemetryFrequencyClass =
		windowCount < 2 ? 'NOT_ENOUGH_DATA' : rate >= 5 ? 'HIGH' : rate >= 2 ? 'MODERATE' : 'LOW';

	// Prop diff
	const prev = prevPropsRef.current;
	const changed: TelemetryPropChangeEntry[] = [];
	const unstable: TelemetryPropInstability[] = [];

	if (prev !== null) {
		const allKeys = [...new Set([...Object.keys(prev), ...Object.keys(props)])];
		for (const key of allKeys) {
			if (ignoreProps.includes(key)) continue;
			const inPrev = key in prev;
			const inNext = key in props;
			if (inPrev && !inNext) {
				changed.push({ kind: 'removed', key, prev: prev[key] });
			} else if (!inPrev && inNext) {
				changed.push({ kind: 'added', key, next: props[key] });
			} else if (!Object.is(prev[key], props[key])) {
				const val = props[key];
				if (isRefValue(val)) {
					const refType = inferRefType(val);
					changed.push({ kind: 'reference-changed', key, refType });
					unstable.push({ name: key, type: refType });
				} else {
					changed.push({ kind: 'value-changed', key, prev: prev[key], next: val });
				}
			}
		}
	}

	let signalKind: TelemetrySignalKind | null = null;
	let inferredTrigger: 'no-prop-change' | 'genuine-prop-change' | 'reference-instability' | 'mixed' =
		'no-prop-change';

	if (changed.length > 0) {
		const hasGenuine = changed.some(
			(e) => e.kind === 'added' || e.kind === 'removed' || e.kind === 'value-changed',
		);
		const hasRef = changed.some((e) => e.kind === 'reference-changed');
		signalKind = hasGenuine && hasRef ? 'mixed' : hasGenuine ? 'genuine' : 'reference-only';
		inferredTrigger =
			hasGenuine && hasRef ? 'mixed' : hasGenuine ? 'genuine-prop-change' : 'reference-instability';

		const w = signalWindowRef.current;
		if (w.length === 20) w.shift();
		w.push(signalKind);
	}

	// Session-level memo classification
	const signalWindow = signalWindowRef.current;
	let memoClassification: TelemetryMemoClassification;
	if (signalWindow.length === 0) {
		memoClassification = 'NOT_APPLICABLE';
	} else {
		const kinds = new Set(signalWindow);
		if (kinds.size === 1 && kinds.has('genuine')) memoClassification = 'EFFECTIVE';
		else if (kinds.size === 1 && kinds.has('reference-only')) memoClassification = 'INEFFECTIVE';
		else memoClassification = 'PARTIALLY_EFFECTIVE';
	}

	// Score
	const freqPenalty =
		classification === 'LOW' || classification === 'NOT_ENOUGH_DATA' ? 0 : classification === 'MODERATE' ? 10 : 25;
	const instabilityPenalty = Math.min(unstable.length * 8, 30);
	const memoPenalty =
		memoClassification === 'INEFFECTIVE' ? 30 : memoClassification === 'PARTIALLY_EFFECTIVE' ? 15 : 0;
	const mixedCount = signalWindow.filter((s) => s === 'mixed').length;
	const mixedSignalPenalty = Math.min(mixedCount * 3, 15);
	const score = Math.max(0, Math.min(100, 100 - freqPenalty - instabilityPenalty - memoPenalty - mixedSignalPenalty));
	const grade: TelemetryHealthGrade =
		score >= 90 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'MODERATE' : 'POOR';

	// Recommendations
	const recommendations: string[] = [];
	if (unstable.length > 0)
		recommendations.push('Wrap reference props with useCallback / useMemo to stabilize references.');
	if (memoClassification === 'INEFFECTIVE')
		recommendations.push('All prop changes are reference-only — React.memo is defeated. Stabilize refs.');
	if (classification === 'HIGH')
		recommendations.push('High re-render frequency detected. Consider debouncing state updates.');
	if (memoClassification === 'PARTIALLY_EFFECTIVE')
		recommendations.push('Mixed genuine + reference signals. Isolate reference props for full memo effectiveness.');

	// Thread session through all factory calls
	let session = sessionRef.current;
	const newEvents: TelemetryEvent[] = [];

	if (!hasStartedRef.current) {
		const { event: startEv, session: s0 } = createSessionStartEvent(session);
		newEvents.push(startEv);
		session = s0;
		hasStartedRef.current = true;
	}

	const triggeredBy = changed.length > 0 ? 'props' : 'parent';
	const { event: renderEv, session: s1 } = createRenderEvent(session, { renderNumber, triggeredBy });
	newEvents.push(renderEv);
	session = s1;

	if (changed.length > 0) {
		const { event: propEv, session: s2 } = createPropChangeEvent(session, {
			renderNumber,
			changed,
			unstable,
			inferredTrigger,
			signalKind: signalKind as TelemetrySignalKind,
		});
		newEvents.push(propEv);
		session = s2;
	}

	const { event: freqEv, session: s3 } = createFrequencyEvent(session, {
		renderNumber,
		windowMs,
		windowCount,
		rate,
		classification,
		totalRenders: renderNumber,
	});
	newEvents.push(freqEv);
	session = s3;

	const { event: scoreEv, session: s4 } = createScoreEvent(session, {
		renderNumber,
		score,
		grade,
		frequencyPenalty: freqPenalty,
		instabilityPenalty,
		memoPenalty,
		mixedSignalPenalty,
		memoClassification,
		signalKind,
	});
	newEvents.push(scoreEv);
	session = s4;

	const { event: recEv, session: s5 } = createRecommendationEvent(session, {
		renderNumber,
		recommendations,
	});
	newEvents.push(recEv);
	session = s5;

	sessionRef.current = session;
	pendingEventsRef.current = newEvents;
	pendingSessionRef.current = session;
	prevPropsRef.current = props;
};

// ── DemoTarget ─────────────────────────────────────────────────

type DemoTargetProps = DemoProps & {
	buffer: TelemetryBuffer;
	ignoreProps?: string[];
};

const DemoTarget = ({ title, count, tags, onAction, buffer, ignoreProps = [] }: DemoTargetProps) => {
	const propsRecord: Record<string, unknown> = { title, count };
	if (tags !== undefined) propsRecord['tags'] = tags;
	if (onAction !== undefined) propsRecord['onAction'] = onAction;

	useTelemetryCapture('DemoTarget', propsRecord, buffer, { ignoreProps });

	const renderCountRef = useRef(0);
	renderCountRef.current += 1;

	return (
		<div className="component-preview">
			<div className="component-preview__label">
				&lt;DemoTarget&gt;
				<span className="render-badge" suppressHydrationWarning>
					render #{renderCountRef.current}
				</span>
			</div>
			<div className="component-preview__body">
				<div className="prop-row">
					<span className="prop-row__key">title</span>
					<span className="prop-row__value">&quot;{title}&quot;</span>
				</div>
				<div className="prop-row">
					<span className="prop-row__key">count</span>
					<span className="prop-row__value prop-row__value--number">{count}</span>
				</div>
				{tags !== undefined && (
					<div className="prop-row">
						<span className="prop-row__key">tags</span>
						<span className="prop-row__value prop-row__value--object">[{tags.join(', ')}]</span>
					</div>
				)}
				{onAction !== undefined && (
					<div className="prop-row">
						<span className="prop-row__key">onAction</span>
						<span className="prop-row__value prop-row__value--function">[Function]</span>
					</div>
				)}
			</div>
		</div>
	);
};

// ── EventStreamPanel ───────────────────────────────────────────

const EVENT_TYPE_BADGE: Record<string, string> = {
	'session-start': 'console-entry__badge--ok',
	'session-end': 'console-entry__badge--ok',
	render: 'console-entry__badge--ok',
	'prop-change': 'console-entry__badge--ok',
	frequency: 'console-entry__badge--ok',
	score: 'console-entry__badge--ok',
	recommendation: 'console-entry__badge--ok',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
	'session-start': 'session-start',
	'session-end': 'session-end',
	render: 'render',
	'prop-change': 'prop-change',
	frequency: 'frequency',
	score: 'score',
	recommendation: 'recommendation',
};

const eventBadgeClass = (event: TelemetryEvent): string => {
	if (event.type === 'prop-change') {
		return event.unstable.length > 0 ? 'console-entry__badge--warn' : 'console-entry__badge--ok';
	}
	if (event.type === 'frequency') {
		return event.classification === 'HIGH' ? 'console-entry__badge--warn' : 'console-entry__badge--ok';
	}
	if (event.type === 'score') {
		return event.grade === 'EXCELLENT' || event.grade === 'GOOD'
			? 'console-entry__badge--ok'
			: 'console-entry__badge--warn';
	}
	return EVENT_TYPE_BADGE[event.type] ?? 'console-entry__badge--ok';
};

const renderEventDetails = (event: TelemetryEvent): ReactNode => {
	if (event.type === 'render') {
		return (
			<div className="console-section">
				<div className="console-section__label">render #{event.renderNumber}</div>
				<div className="console-section__line console-section__line--added">
					<span className="console-line__key">triggeredBy</span>
					<span className="console-line__added">{event.triggeredBy}</span>
				</div>
			</div>
		);
	}
	if (event.type === 'prop-change') {
		return (
			<div className="console-section">
				<div className="console-section__label">
					render #{event.renderNumber} · {event.changed.length} changed
					{event.unstable.length > 0 ? ` · ${event.unstable.length} unstable` : ''} ·{' '}
					<span
						className={event.signalKind === 'genuine' ? 'console-line__added' : 'console-line__ref'}
					>
						{event.signalKind}
					</span>
				</div>
				{event.changed.slice(0, 5).map((e, i) => (
					<div
						key={i}
						className={`console-section__line ${e.kind === 'reference-changed' ? 'console-section__line--reference' : 'console-section__line--added'}`}
					>
						<span className="console-line__key">{e.key}</span>
						<span className={e.kind === 'reference-changed' ? 'console-line__ref' : 'console-line__added'}>
							{e.kind === 'reference-changed'
								? `new ${e.refType} reference`
								: e.kind === 'value-changed'
									? 'value changed'
									: e.kind}
						</span>
					</div>
				))}
			</div>
		);
	}
	if (event.type === 'frequency') {
		return (
			<div className="console-section">
				<div className="console-section__label">
					render #{event.renderNumber} · {event.classification}
					{event.classification !== 'NOT_ENOUGH_DATA' ? ` · ${event.rate.toFixed(2)}/s` : ''}
				</div>
			</div>
		);
	}
	if (event.type === 'score') {
		return (
			<div className="console-section">
				<div className="console-section__label">
					render #{event.renderNumber} · {event.score}/100 · {event.grade}
				</div>
				<div className="console-section__line console-section__line--added">
					<span className="console-line__key">memo</span>
					<span className="console-line__added">{event.memoClassification}</span>
				</div>
			</div>
		);
	}
	if (event.type === 'recommendation') {
		if (event.recommendations.length === 0) return null;
		return (
			<div className="console-section">
				<div className="console-section__label">
					render #{event.renderNumber} · {event.recommendations.length} recommendation
					{event.recommendations.length !== 1 ? 's' : ''}
				</div>
				{event.recommendations.map((r, i) => (
					<div key={i} className="console-section__line console-section__line--reference">
						<span className="console-line__ref">{r}</span>
					</div>
				))}
			</div>
		);
	}
	if (event.type === 'session-end') {
		return (
			<div className="console-section">
				<div className="console-section__label">
					total renders: {event.totalRenders} · duration: {event.durationMs.toFixed(0)}ms
				</div>
			</div>
		);
	}
	return null;
};

const EventRow = ({ event }: { event: TelemetryEvent }) => {
	const badgeClass = eventBadgeClass(event);
	const label = EVENT_TYPE_LABEL[event.type] ?? event.type;

	return (
		<div className="console-entry">
			<div className="console-entry__header">
				<span className="console-entry__title">[telemetry-core] &lt;DemoTarget&gt;</span>
				<span className="console-entry__meta">
					<span className={`console-entry__badge ${badgeClass}`}>{label}</span>
					<span className="console-entry__render">seq #{event.sequenceNumber}</span>
					<span className="console-entry__time">{formatTime(event.wallTimestamp)}</span>
				</span>
			</div>
			{renderEventDetails(event)}
		</div>
	);
};

type EventStreamPanelProps = {
	buffer: TelemetryBuffer;
	onClear: () => void;
};

// EventStreamPanel owns the useSyncExternalStore subscription so that buffer
// notifications only re-render this component — not ScenarioInner and not
// DemoTarget (a sibling). This prevents the push→notify→re-render→push loop.
const EventStreamPanel = ({ buffer, onClear }: EventStreamPanelProps) => {
	const snapshot = useSyncExternalStore(
		buffer.subscribe,
		buffer.getSnapshot,
		buffer.getServerSnapshot,
	);

	const displayed = [...snapshot.events].reverse().slice(0, 50);

	return (
		<div className="demo-pane">
			<div className="demo-pane__header">
				<span className="demo-pane__title">Event stream (TelemetryBuffer)</span>
				{snapshot.events.length > 0 && (
					<button className="btn btn--ghost btn--sm" onClick={onClear}>
						clear
					</button>
				)}
			</div>
			<div className="demo-pane__body console-panel">
				{displayed.length === 0 ? (
					<div className="console-panel__empty">
						<span>Trigger an action above.</span>
						<span className="console-panel__empty-hint">No output = no events emitted yet.</span>
					</div>
				) : (
					displayed.map((event) => <EventRow key={event.id} event={event} />)
				)}
			</div>
		</div>
	);
};

// ── ScenarioTabs ───────────────────────────────────────────────

type ScenarioTabsProps = {
	active: ScenarioId;
	onChange: (id: ScenarioId) => void;
};

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
					{s.badge === 'warn' ? '⚠' : '✓'}
				</span>
				{s.label}
			</button>
		))}
	</div>
);

// ── ScenarioInner ──────────────────────────────────────────────

type ScenarioInnerProps = {
	scenario: Scenario;
};

const ScenarioInner = ({ scenario }: ScenarioInnerProps) => {
	const [parentTick, setParentTick] = useState(0);
	const [dataTick, setDataTick] = useState(0);

	// Buffer is stable for the lifetime of this ScenarioInner instance.
	// Re-created when scenario changes (via key prop on ScenarioInner).
	// Subscription lives in EventStreamPanel — NOT here — so buffer notifications
	// only re-render EventStreamPanel, not ScenarioInner (and not DemoTarget).
	const bufferRef = useRef(createTelemetryBuffer({ maxEvents: 200 }));

	const clear = useCallback(() => bufferRef.current.clear(), []);

	// Unstable refs (change with parentTick — new reference, same value)
	const unstableTags = useMemo<string[]>(() => ['admin', 'power-user'], [parentTick]);
	const unstableOnAction = useCallback(() => {}, [parentTick]);

	const demoProps = useMemo<DemoProps>(() => {
		if (scenario.id === 'basic-lifecycle') {
			return { title: 'Dashboard', count: 0 };
		}
		if (scenario.id === 'prop-changes') {
			return { title: 'Dashboard', count: dataTick };
		}
		if (scenario.id === 'reference-instability') {
			return { title: 'Dashboard', count: 0, tags: unstableTags, onAction: unstableOnAction };
		}
		// full-pipeline
		return { title: 'Dashboard', count: dataTick, tags: unstableTags, onAction: unstableOnAction };
	}, [scenario.id, dataTick, unstableTags, unstableOnAction]);

	const handleTrigger = useCallback(() => {
		if (scenario.triggerBothTicks) {
			setParentTick((t) => t + 1);
			setDataTick((t) => t + 1);
		} else if (scenario.id === 'reference-instability') {
			setParentTick((t) => t + 1);
		} else {
			// basic-lifecycle and prop-changes bump parentTick/dataTick respectively
			if (scenario.id === 'prop-changes') {
				setDataTick((t) => t + 1);
			} else {
				setParentTick((t) => t + 1);
			}
		}
	}, [scenario.id, scenario.triggerBothTicks]);

	return (
		<div className="scenario-body">
			<div className="demo-grid">
				<DemoTarget {...demoProps} buffer={bufferRef.current} />
				<EventStreamPanel buffer={bufferRef.current} onClear={clear} />
			</div>

			<div className="scenario-controls">
				<button className="btn btn--primary" onClick={handleTrigger}>
					{scenario.triggerLabel}
				</button>
			</div>

			<details className="code-hint">
				<summary>See the code</summary>
				<div className="code-hint__body">
					{scenario.canFix && (
						<div className="code-hint__label code-hint__label--bad">❌ The pattern:</div>
					)}
					<pre className="code-hint__pre">{scenario.codeBreaking}</pre>
					{scenario.canFix && scenario.codeFixed && (
						<>
							<div className="code-hint__label code-hint__label--good">✅ The fix:</div>
							<pre className="code-hint__pre">{scenario.codeFixed}</pre>
						</>
					)}
				</div>
			</details>
		</div>
	);
};

// ── RenderTelemetryCoreDemo ────────────────────────────────────

export const RenderTelemetryCoreDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('basic-lifecycle');
	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	return (
		<>
			<ScenarioTabs active={activeId} onChange={setActiveId} />

			<div className="scenario-header">
				<span className={`scenario-badge scenario-badge--${activeScenario.badge}`}>
					{activeScenario.badge === 'warn' ? '⚠ health issues' : '✓ healthy'}
				</span>
				<p className="scenario-description">{activeScenario.description}</p>
			</div>

			<ScenarioInner key={activeId} scenario={activeScenario} />

			<details className="code-hint code-hint--usage">
				<summary>How to use render-telemetry-core</summary>
				<div className="code-hint__body">
					<pre className="code-hint__pre">{`import {
  createTelemetryBuffer,
  createTelemetrySession,
  createSessionStartEvent,
  createRenderEvent,
  endTelemetrySession,
  createSessionEndEvent,
  registerTransport,
  createMemoryTransport,
  emitEvents,
} from '@sapanmozammel/render-telemetry-core';
import { useSyncExternalStore } from 'react';

// 1. Register a transport (once, app-level)
const transport = createMemoryTransport();
registerTransport(transport);

// 2. In your component (or custom hook):
const buffer = createTelemetryBuffer();
let session = createTelemetrySession('MyComponent');

// 3. On mount: emit session-start
const { event: startEv, session: s1 } = createSessionStartEvent(session);
session = s1;
buffer.push(startEv);
buffer.pushSession(session);
emitEvents([startEv]);

// 4. On each render: emit render + other events
const { event: renderEv, session: s2 } = createRenderEvent(session, {
  renderNumber: 1,
  triggeredBy: 'props',
});
session = s2;
buffer.push(renderEv);
buffer.updateSession(session);
emitEvents([renderEv]);

// 5. Subscribe to buffer for live display
const snapshot = useSyncExternalStore(
  buffer.subscribe,
  buffer.getSnapshot,
  buffer.getServerSnapshot,
);
// snapshot.events — live event log
// snapshot.sessions — all active sessions`}</pre>
					<p className="code-hint__note">
						Zero production cost: this package has no built-in NODE_ENV guard. Only create sessions
						where you want telemetry — your wrapper hook decides when.
					</p>
				</div>
			</details>
		</>
	);
};
