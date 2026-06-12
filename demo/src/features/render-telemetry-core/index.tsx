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

const isRefValue = (v: unknown): boolean =>
	typeof v === 'function' || Array.isArray(v) || (typeof v === 'object' && v !== null);

const inferRefType = (v: unknown): TelemetryPropRefType =>
	typeof v === 'function' ? 'function' : Array.isArray(v) ? 'array' : 'object';

const formatTime = (ts: number): string => new Date(ts).toTimeString().slice(0, 8);

const BADGE_OK = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-ok bg-ok-dim';
const BADGE_WARN = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-warn bg-warn-dim';

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

	useEffect(() => {
		const events = pendingEventsRef.current;
		const finalSession = pendingSessionRef.current;
		if (events.length === 0) return;
		for (const ev of events) buffer.push(ev);
		if (finalSession) buffer.updateSession(finalSession);
		pendingEventsRef.current = [];
		pendingSessionRef.current = null;
	});

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

	const now = Date.now();
	renderCountRef.current += 1;
	const renderNumber = renderCountRef.current;

	if (sessionRef.current === null) {
		sessionRef.current = createTelemetrySession(componentName);
	}

	timestampsRef.current.push(now);
	const windowStart = now - windowMs;
	while (timestampsRef.current.length > 0 && (timestampsRef.current[0] ?? 0) < windowStart) {
		timestampsRef.current.shift();
	}
	const windowCount = timestampsRef.current.length;
	const rate = windowCount >= 2 ? ((windowCount - 1) / windowMs) * 1000 : 0;
	const classification: TelemetryFrequencyClass =
		windowCount < 2 ? 'NOT_ENOUGH_DATA' : rate >= 5 ? 'HIGH' : rate >= 2 ? 'MODERATE' : 'LOW';

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

	const recommendations: string[] = [];
	if (unstable.length > 0)
		recommendations.push('Wrap reference props with useCallback / useMemo to stabilize references.');
	if (memoClassification === 'INEFFECTIVE')
		recommendations.push('All prop changes are reference-only — React.memo is defeated. Stabilize refs.');
	if (classification === 'HIGH')
		recommendations.push('High re-render frequency detected. Consider debouncing state updates.');
	if (memoClassification === 'PARTIALLY_EFFECTIVE')
		recommendations.push('Mixed genuine + reference signals. Isolate reference props for full memo effectiveness.');

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
		<div className="bg-elevated border border-edge rounded-md overflow-hidden mb-4">
			<div className="text-[11px] text-dim px-3 py-1.5 border-b border-edge bg-raised flex items-center justify-between">
				&lt;DemoTarget&gt;
				<span className="inline-flex items-center gap-1 text-[11px] text-dim px-2 py-0.5 rounded-full border border-edge bg-elevated ml-2" suppressHydrationWarning>
					render #{renderCountRef.current}
				</span>
			</div>
			<div className="p-3">
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">title</span>
					<span className="text-ink break-all">&quot;{title}&quot;</span>
				</div>
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">count</span>
					<span className="text-ink break-all">{count}</span>
				</div>
				{tags !== undefined && (
					<div className="flex gap-3 py-0.75 text-[13px]">
						<span className="text-muted min-w-20 shrink-0">tags</span>
						<span className="text-purple break-all">[{tags.join(', ')}]</span>
					</div>
				)}
				{onAction !== undefined && (
					<div className="flex gap-3 py-0.75 text-[13px]">
						<span className="text-muted min-w-20 shrink-0">onAction</span>
						<span className="text-brand break-all">[Function]</span>
					</div>
				)}
			</div>
		</div>
	);
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
		return event.unstable.length > 0 ? BADGE_WARN : BADGE_OK;
	}
	if (event.type === 'frequency') {
		return event.classification === 'HIGH' ? BADGE_WARN : BADGE_OK;
	}
	if (event.type === 'score') {
		return event.grade === 'EXCELLENT' || event.grade === 'GOOD' ? BADGE_OK : BADGE_WARN;
	}
	return BADGE_OK;
};

const renderEventDetails = (event: TelemetryEvent): ReactNode => {
	if (event.type === 'render') {
		return (
			<div className="mb-1.5">
				<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">render #{event.renderNumber}</div>
				<div className="flex gap-3 py-px pl-2 border-l-2 border-ok">
					<span className="text-muted min-w-20 shrink-0">triggeredBy</span>
					<span className="text-ok break-all">{event.triggeredBy}</span>
				</div>
			</div>
		);
	}
	if (event.type === 'prop-change') {
		return (
			<div className="mb-1.5">
				<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">
					render #{event.renderNumber} · {event.changed.length} changed
					{event.unstable.length > 0 ? ` · ${event.unstable.length} unstable` : ''} ·{' '}
					<span className={event.signalKind === 'genuine' ? 'text-ok' : 'text-warn'}>
						{event.signalKind}
					</span>
				</div>
				{event.changed.slice(0, 5).map((e, i) => (
					<div
						key={i}
						className={`flex gap-3 py-px pl-2 border-l-2 ${e.kind === 'reference-changed' ? 'border-purple' : 'border-ok'}`}
					>
						<span className="text-muted min-w-20 shrink-0">{e.key}</span>
						<span className={e.kind === 'reference-changed' ? 'text-warn break-all' : 'text-ok break-all'}>
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
			<div className="mb-1.5">
				<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">
					render #{event.renderNumber} · {event.classification}
					{event.classification !== 'NOT_ENOUGH_DATA' ? ` · ${event.rate.toFixed(2)}/s` : ''}
				</div>
			</div>
		);
	}
	if (event.type === 'score') {
		return (
			<div className="mb-1.5">
				<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">
					render #{event.renderNumber} · {event.score}/100 · {event.grade}
				</div>
				<div className="flex gap-3 py-px pl-2 border-l-2 border-ok">
					<span className="text-muted min-w-20 shrink-0">memo</span>
					<span className="text-ok break-all">{event.memoClassification}</span>
				</div>
			</div>
		);
	}
	if (event.type === 'recommendation') {
		if (event.recommendations.length === 0) return null;
		return (
			<div className="mb-1.5">
				<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">
					render #{event.renderNumber} · {event.recommendations.length} recommendation
					{event.recommendations.length !== 1 ? 's' : ''}
				</div>
				{event.recommendations.map((r, i) => (
					<div key={i} className="flex gap-3 py-px pl-2 border-l-2 border-purple">
						<span className="text-warn break-all">{r}</span>
					</div>
				))}
			</div>
		);
	}
	if (event.type === 'session-end') {
		return (
			<div className="mb-1.5">
				<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">
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
		<div className="border-b border-edge py-2.5 last:border-b-0">
			<div className="flex items-center justify-between mb-2">
				<span className="text-ink font-semibold">[telemetry-core] &lt;DemoTarget&gt;</span>
				<span className="flex items-center gap-2">
					<span className={badgeClass}>{label}</span>
					<span className="text-dim text-[11px]">seq #{event.sequenceNumber}</span>
					<span className="text-dim text-[11px]">{formatTime(event.wallTimestamp)}</span>
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

const EventStreamPanel = ({ buffer, onClear }: EventStreamPanelProps) => {
	const snapshot = useSyncExternalStore(
		buffer.subscribe,
		buffer.getSnapshot,
		buffer.getServerSnapshot,
	);

	const displayed = [...snapshot.events].reverse().slice(0, 50);

	return (
		<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
			<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
				<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">Event stream (TelemetryBuffer)</span>
				{snapshot.events.length > 0 && (
					<button
						className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-transparent bg-transparent text-muted text-[11px] hover:text-ink hover:bg-raised cursor-pointer transition-colors"
						onClick={onClear}
					>
						clear
					</button>
				)}
			</div>
			<div className="p-4 text-xs min-h-50">
				{displayed.length === 0 ? (
					<div className="py-6 text-center text-dim text-xs flex flex-col gap-1">
						<span>Trigger an action above.</span>
						<span className="text-[11px] opacity-70">No output = no events emitted yet.</span>
					</div>
				) : (
					displayed.map((event) => <EventRow key={event.id} event={event} />)
				)}
			</div>
		</div>
	);
};

type ScenarioTabsProps = {
	active: ScenarioId;
	onChange: (id: ScenarioId) => void;
};

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
				<span className={s.badge === 'warn' ? 'text-warn' : 'text-ok'}>
					{s.badge === 'warn' ? '⚠' : '✓'}
				</span>
				{s.label}
			</button>
		))}
	</div>
);

type ScenarioInnerProps = {
	scenario: Scenario;
};

const ScenarioInner = ({ scenario }: ScenarioInnerProps) => {
	const [parentTick, setParentTick] = useState(0);
	const [dataTick, setDataTick] = useState(0);

	const bufferRef = useRef(createTelemetryBuffer({ maxEvents: 200 }));

	const clear = useCallback(() => bufferRef.current.clear(), []);

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
		return { title: 'Dashboard', count: dataTick, tags: unstableTags, onAction: unstableOnAction };
	}, [scenario.id, dataTick, unstableTags, unstableOnAction]);

	const handleTrigger = useCallback(() => {
		if (scenario.triggerBothTicks) {
			setParentTick((t) => t + 1);
			setDataTick((t) => t + 1);
		} else if (scenario.id === 'reference-instability') {
			setParentTick((t) => t + 1);
		} else {
			if (scenario.id === 'prop-changes') {
				setDataTick((t) => t + 1);
			} else {
				setParentTick((t) => t + 1);
			}
		}
	}, [scenario.id, scenario.triggerBothTicks]);

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-5 items-start max-md:grid-cols-1">
				<DemoTarget {...demoProps} buffer={bufferRef.current} />
				<EventStreamPanel buffer={bufferRef.current} onClear={clear} />
			</div>

			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand-dim bg-brand-dim text-brand text-xs hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={handleTrigger}
				>
					{scenario.triggerLabel}
				</button>
			</div>

			<details className="border border-edge rounded-[10px] overflow-hidden group">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					See the code
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					{scenario.canFix && (
						<div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-error">❌ The pattern:</div>
					)}
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{scenario.codeBreaking}</pre>
					{scenario.canFix && scenario.codeFixed && (
						<>
							<div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ok">✅ The fix:</div>
							<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{scenario.codeFixed}</pre>
						</>
					)}
				</div>
			</details>
		</div>
	);
};

export const RenderTelemetryCoreDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('basic-lifecycle');
	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	return (
		<>
			<ScenarioTabs active={activeId} onChange={setActiveId} />

			<div className="mb-5 flex flex-col gap-2.5">
				<span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.75 rounded-full border w-fit ${
					activeScenario.badge === 'warn'
						? 'border-warn-dim bg-warn-dim text-warn'
						: 'border-ok-dim bg-ok-dim text-ok'
				}`}>
					{activeScenario.badge === 'warn' ? '⚠ health issues' : '✓ healthy'}
				</span>
				<p className="text-[13px] text-muted max-w-150 leading-[1.7]">{activeScenario.description}</p>
			</div>

			<ScenarioInner key={activeId} scenario={activeScenario} />

			<details className="border border-edge rounded-[10px] overflow-hidden group mt-2">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					How to use render-telemetry-core
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import {
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
					<p className="text-xs text-dim leading-[1.6]">
						Zero production cost: this package has no built-in NODE_ENV guard. Only create sessions
						where you want telemetry — your wrapper hook decides when.
					</p>
				</div>
			</details>
		</>
	);
};
