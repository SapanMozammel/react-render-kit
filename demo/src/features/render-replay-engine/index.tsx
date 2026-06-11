'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
	createReplayEngine,
	buildReplaySessions,
	fromEvents,
	applyPreset,
} from '@sapanmozammel/render-replay-engine';
import type {
	ReplayCursor,
	ReplayEngine,
	ReplayFrame,
	ReplayFilterPreset,
} from '@sapanmozammel/render-replay-engine';
import {
	createTelemetrySession,
	createSessionStartEvent,
	createRenderEvent,
	createPropChangeEvent,
	createScoreEvent,
	createRecommendationEvent,
	createFrequencyEvent,
	endTelemetrySession,
	createSessionEndEvent,
} from '@sapanmozammel/render-telemetry-core';
import type { TelemetryEvent } from '@sapanmozammel/render-telemetry-core';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

// ── Synthetic event builder ────────────────────────────────────────────────────

type SyntheticRender = {
	score: number;
	hasUnstableProps: boolean;
	hasGenuineProps: boolean;
};

const SYNTHETIC_RENDERS: readonly SyntheticRender[] = [
	{ score: 95, hasUnstableProps: false, hasGenuineProps: true },
	{ score: 88, hasUnstableProps: false, hasGenuineProps: true },
	{ score: 55, hasUnstableProps: true, hasGenuineProps: false },
	{ score: 72, hasUnstableProps: false, hasGenuineProps: true },
	{ score: 40, hasUnstableProps: true, hasGenuineProps: false },
	{ score: 91, hasUnstableProps: false, hasGenuineProps: true },
	{ score: 63, hasUnstableProps: true, hasGenuineProps: true },
	{ score: 30, hasUnstableProps: true, hasGenuineProps: false },
	{ score: 85, hasUnstableProps: false, hasGenuineProps: true },
	{ score: 22, hasUnstableProps: true, hasGenuineProps: false },
];

const buildSyntheticEvents = (componentName = 'DemoComponent'): readonly TelemetryEvent[] => {
	const events: TelemetryEvent[] = [];
	let session = createTelemetrySession(componentName);

	const { event: startEv, session: s0 } = createSessionStartEvent(session);
	events.push(startEv);
	session = s0;

	for (let i = 0; i < SYNTHETIC_RENDERS.length; i++) {
		const r = SYNTHETIC_RENDERS[i]!;
		const renderNumber = i + 1;

		const { event: renderEv, session: s1 } = createRenderEvent(session, {
			renderNumber,
			triggeredBy: r.hasGenuineProps ? 'props' : 'parent',
		});
		events.push(renderEv);
		session = s1;

		if (r.hasUnstableProps || r.hasGenuineProps) {
			const changed = r.hasGenuineProps
				? [{ kind: 'value-changed' as const, key: 'count', prev: i, next: i + 1 }]
				: [];
			const unstable = r.hasUnstableProps
				? [{ name: 'onClick', type: 'function' as const }]
				: [];

			const { event: propEv, session: s2 } = createPropChangeEvent(session, {
				renderNumber,
				changed,
				unstable,
				inferredTrigger: r.hasGenuineProps ? 'genuine-prop-change' : 'reference-instability',
				signalKind: r.hasGenuineProps && r.hasUnstableProps
					? 'mixed'
					: r.hasGenuineProps
						? 'genuine'
						: 'reference-only',
			});
			events.push(propEv);
			session = s2;
		}

		const grade =
			r.score >= 90 ? 'EXCELLENT' : r.score >= 70 ? 'GOOD' : r.score >= 50 ? 'MODERATE' : 'POOR';
		const { event: scoreEv, session: s3 } = createScoreEvent(session, {
			renderNumber,
			score: r.score,
			grade,
			frequencyPenalty: 0,
			instabilityPenalty: r.hasUnstableProps ? 25 : 0,
			memoPenalty: 0,
			mixedSignalPenalty: 0,
			memoClassification: 'NOT_APPLICABLE',
			signalKind: r.hasGenuineProps ? 'genuine' : r.hasUnstableProps ? 'reference-only' : null,
		});
		events.push(scoreEv);
		session = s3;

		const { event: freqEv, session: s4 } = createFrequencyEvent(session, {
			renderNumber,
			windowMs: 10000,
			windowCount: renderNumber,
			rate: renderNumber / 10,
			classification: renderNumber > 8 ? 'MODERATE' : 'LOW',
			totalRenders: renderNumber,
		});
		events.push(freqEv);
		session = s4;

		if (r.hasUnstableProps) {
			const { event: recEv, session: s5 } = createRecommendationEvent(session, {
				renderNumber,
				recommendations: ['Wrap onClick with useCallback to stabilize the reference.'],
			});
			events.push(recEv);
			session = s5;
		}
	}

	const ended = endTelemetrySession(session);
	const { event: endEv } = createSessionEndEvent(ended, {
		totalRenders: SYNTHETIC_RENDERS.length,
	});
	events.push(endEv);

	return Object.freeze(events);
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const scoreBadgeClass = (score: number): string => {
	if (score >= 80) return 'console-entry__badge--ok';
	if (score >= 50) return 'console-entry__badge--neutral';
	return 'console-entry__badge--warn';
};

const getUnstableNames = (frame: ReplayFrame): readonly string[] =>
	frame.propChangeEvent?.unstable.map((u) => u.name) ?? [];

const getChangedProps = (frame: ReplayFrame): ReadonlyArray<{ key: string; kind: string }> =>
	frame.propChangeEvent?.changed.map((c) => ({ key: c.key, kind: c.kind })) ?? [];

// ── Frame row ──────────────────────────────────────────────────────────────────

type FrameRowProps = {
	frame: ReplayFrame;
	isActive: boolean;
	onClick: () => void;
};

const FrameRow = ({ frame, isActive, onClick }: FrameRowProps) => {
	const unstableNames = getUnstableNames(frame);
	const changedProps = getChangedProps(frame);

	return (
		<div
			className={`console-entry${isActive ? ' console-entry--active' : ''}`}
			onClick={onClick}
			style={{ cursor: 'pointer' }}
		>
			<div className="console-entry__header">
				<span className="console-entry__title">
					render #{frame.renderNumber}
					{frame.hasUnstableProps && (
						<span className="console-entry__badge console-entry__badge--warn" style={{ marginLeft: 8 }}>
							unstable
						</span>
					)}
				</span>
				<span className="console-entry__meta">
					<span className={`console-entry__badge ${scoreBadgeClass(frame.score ?? 100)}`}>
						{frame.score !== null ? `${frame.score}/100` : '—'}
					</span>
					<span className="console-entry__render">{frame.triggeredBy}</span>
				</span>
			</div>
			{(changedProps.length > 0 || unstableNames.length > 0) && (
				<div className="console-section">
					{changedProps.slice(0, 3).map((p, i) => (
						<div
							key={i}
							className="console-section__line console-section__line--added"
						>
							<span className="console-line__key">{p.key}</span>
							<span className="console-line__added">{p.kind}</span>
						</div>
					))}
					{unstableNames.map((n, i) => (
						<div key={i} className="console-section__line console-section__line--reference">
							<span className="console-line__key">{n}</span>
							<span className="console-line__ref">unstable ref</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

// ── Stats panel ────────────────────────────────────────────────────────────────

type StatsPanelProps = {
	engine: ReplayEngine;
	cursor: ReplayCursor;
};

const StatsPanel = ({ engine, cursor }: StatsPanelProps) => {
	const { stats } = engine.session;
	const frame = engine.getFrame(cursor.frameIndex);
	const unstableNames = frame ? getUnstableNames(frame) : [];

	return (
		<div className="demo-pane">
			<div className="demo-pane__header">
				<span className="demo-pane__title">Current Frame</span>
				<span className="console-entry__meta">
					<span className="console-entry__render">
						{cursor.frameIndex + 1} / {engine.session.frameCount}
					</span>
				</span>
			</div>
			<div
				className="demo-pane__body"
				style={{ padding: '12px 16px', gap: 8, display: 'flex', flexDirection: 'column' }}
			>
				{frame && (
					<>
						<div className="prop-row">
							<span className="prop-row__key">renderNumber</span>
							<span className="prop-row__value prop-row__value--number">{frame.renderNumber}</span>
						</div>
						<div className="prop-row">
							<span className="prop-row__key">score</span>
							<span className={`prop-row__value ${scoreBadgeClass(frame.score ?? 100)}`}>
								{frame.score !== null ? frame.score : '—'}
							</span>
						</div>
						<div className="prop-row">
							<span className="prop-row__key">triggeredBy</span>
							<span className="prop-row__value">{frame.triggeredBy}</span>
						</div>
						<div className="prop-row">
							<span className="prop-row__key">unstableProps</span>
							<span className="prop-row__value">
								{unstableNames.length > 0 ? unstableNames.join(', ') : 'none'}
							</span>
						</div>
					</>
				)}
				<hr style={{ margin: '8px 0', borderColor: 'var(--border-subtle)' }} />
				<div className="prop-row">
					<span className="prop-row__key">avgScore</span>
					<span className="prop-row__value prop-row__value--number">
						{stats.averageScore !== null ? stats.averageScore.toFixed(1) : '—'}
					</span>
				</div>
				<div className="prop-row">
					<span className="prop-row__key">ineffective renders</span>
					<span className="prop-row__value prop-row__value--number">{stats.ineffectiveRenderCount}</span>
				</div>
				<div className="prop-row">
					<span className="prop-row__key">unstable prop names</span>
					<span className="prop-row__value">
						{stats.unstablePropNames.length > 0 ? stats.unstablePropNames.join(', ') : 'none'}
					</span>
				</div>
			</div>
		</div>
	);
};

// ── Scenario panels ────────────────────────────────────────────────────────────

const PRESETS: readonly ReplayFilterPreset[] = [
	'issues-only',
	'reference-instability',
	'high-frequency',
	'ineffective-memo',
	'prop-changes-only',
	'parent-triggered-only',
	'score-degradation',
];

const BasicReplayPanel = () => {
	const events = useMemo(() => buildSyntheticEvents(), []);
	const engine = useMemo(() => createReplayEngine(fromEvents(events)), [events]);
	const [cursor, setCursor] = useState<ReplayCursor>(() => engine.navigate.atStart());

	const goNext = useCallback(() => {
		const next = engine.navigate.next(cursor);
		if (next) setCursor(next);
	}, [engine, cursor]);

	const goPrev = useCallback(() => {
		const prev = engine.navigate.previous(cursor);
		if (prev) setCursor(prev);
	}, [engine, cursor]);

	const goStart = useCallback(() => setCursor(engine.navigate.atStart()), [engine]);
	const goEnd = useCallback(() => setCursor(engine.navigate.atEnd()), [engine]);

	return (
		<div className="scenario-body">
			<div className="demo-grid">
				<div className="demo-pane">
					<div className="demo-pane__header">
						<span className="demo-pane__title">Frames ({engine.session.frameCount})</span>
					</div>
					<div className="demo-pane__body console-panel">
						{engine.session.frames.map((frame) => (
							<FrameRow
								key={frame.frameIndex}
								frame={frame}
								isActive={cursor.frameIndex === frame.frameIndex}
								onClick={() => {
									const c = engine.navigate.seek(cursor, frame.frameIndex);
									if (c) setCursor(c);
								}}
							/>
						))}
					</div>
				</div>
				<StatsPanel engine={engine} cursor={cursor} />
			</div>

			<div className="scenario-controls">
				<button
					className="btn btn--ghost btn--sm"
					onClick={goStart}
					disabled={cursor.frameIndex === 0}
				>
					⏮ Start
				</button>
				<button
					className="btn btn--primary"
					onClick={goPrev}
					disabled={cursor.frameIndex === 0}
				>
					← Prev
				</button>
				<button
					className="btn btn--primary"
					onClick={goNext}
					disabled={cursor.frameIndex === engine.session.frameCount - 1}
				>
					Next →
				</button>
				<button
					className="btn btn--ghost btn--sm"
					onClick={goEnd}
					disabled={cursor.frameIndex === engine.session.frameCount - 1}
				>
					End ⏭
				</button>
			</div>
		</div>
	);
};

const FilterIssuesPanel = () => {
	const events = useMemo(() => buildSyntheticEvents(), []);
	const engine = useMemo(() => createReplayEngine(fromEvents(events)), [events]);
	const result = useMemo(() => engine.applyPreset('issues-only'), [engine]);
	const filteredFrames = useMemo(
		() => result.matchingFrameIndices.map((i) => engine.getFrame(i)).filter((f): f is ReplayFrame => f !== null),
		[engine, result],
	);
	const [cursor, setCursor] = useState<ReplayCursor>(() => engine.navigate.atStart());

	const jumpToNextIssue = useCallback(() => {
		const next = engine.navigate.nextMatching(cursor, { maxScore: 69 });
		if (next) setCursor(next);
	}, [engine, cursor]);

	const jumpToPrevIssue = useCallback(() => {
		const prev = engine.navigate.previousMatching(cursor, { maxScore: 69 });
		if (prev) setCursor(prev);
	}, [engine, cursor]);

	return (
		<div className="scenario-body">
			<div className="demo-grid">
				<div className="demo-pane">
					<div className="demo-pane__header">
						<span className="demo-pane__title">
							Issues Only ({result.matchingFrameCount}/{engine.session.frameCount} frames)
						</span>
					</div>
					<div className="demo-pane__body console-panel">
						{filteredFrames.length === 0 ? (
							<div className="console-panel__empty">
								<span>No issues found.</span>
							</div>
						) : (
							filteredFrames.map((frame) => (
								<FrameRow
									key={frame.frameIndex}
									frame={frame}
									isActive={cursor.frameIndex === frame.frameIndex}
									onClick={() => {
										const c = engine.navigate.seek(cursor, frame.frameIndex);
										if (c) setCursor(c);
									}}
								/>
							))
						)}
					</div>
				</div>
				<StatsPanel engine={engine} cursor={cursor} />
			</div>

			<div className="scenario-controls">
				<button className="btn btn--primary" onClick={jumpToPrevIssue}>
					← Prev issue
				</button>
				<button className="btn btn--primary" onClick={jumpToNextIssue}>
					Next issue →
				</button>
			</div>
		</div>
	);
};

const BookmarksPanel = () => {
	const events = useMemo(() => buildSyntheticEvents(), []);
	const engine = useMemo(() => createReplayEngine(fromEvents(events)), [events]);
	const [cursor, setCursor] = useState<ReplayCursor>(() => engine.navigate.atStart());
	const bookmarkIdRef = useRef<string | null>(null);
	const [bookmarks, setBookmarks] = useState(() => engine.bookmarks.getAll());
	const [log, setLog] = useState<string[]>([]);

	const refreshBookmarks = useCallback(() => setBookmarks(engine.bookmarks.getAll()), [engine]);

	const addBookmark = useCallback(() => {
		const frame = engine.getFrame(cursor.frameIndex);
		if (!frame) return;
		const bm = engine.bookmarks.create({
			frameIndex: cursor.frameIndex,
			sessionId: engine.session.id,
			label: `render #${frame.renderNumber}`,
		});
		bookmarkIdRef.current = bm.id;
		refreshBookmarks();
		setLog((l) => [...l, `Created bookmark "${bm.label}" (id: ${bm.id.slice(0, 8)}…)`]);
	}, [engine, cursor, refreshBookmarks]);

	const updateBookmark = useCallback(() => {
		const id = bookmarkIdRef.current;
		if (!id) return;
		engine.bookmarks.update(id, { label: 'Updated label' });
		refreshBookmarks();
		setLog((l) => [...l, 'Updated bookmark label to "Updated label"']);
	}, [engine, refreshBookmarks]);

	const jumpToBookmark = useCallback(() => {
		const id = bookmarkIdRef.current;
		if (!id) return;
		const c = engine.navigate.jumpToBookmark(id);
		if (c) {
			setCursor(c);
			setLog((l) => [...l, `Jumped to bookmark at frameIndex ${c.frameIndex}`]);
		}
	}, [engine]);

	const removeBookmark = useCallback(() => {
		const id = bookmarkIdRef.current;
		if (!id) return;
		engine.bookmarks.remove(id);
		bookmarkIdRef.current = null;
		refreshBookmarks();
		setLog((l) => [...l, 'Removed bookmark']);
	}, [engine, refreshBookmarks]);

	return (
		<div className="scenario-body">
			<div className="demo-grid">
				<div className="demo-pane">
					<div className="demo-pane__header">
						<span className="demo-pane__title">Frames</span>
					</div>
					<div className="demo-pane__body console-panel">
						{engine.session.frames.map((frame) => (
							<FrameRow
								key={frame.frameIndex}
								frame={frame}
								isActive={cursor.frameIndex === frame.frameIndex}
								onClick={() => {
									const c = engine.navigate.seek(cursor, frame.frameIndex);
									if (c) setCursor(c);
								}}
							/>
						))}
					</div>
				</div>
				<div className="demo-pane">
					<div className="demo-pane__header">
						<span className="demo-pane__title">Bookmarks ({bookmarks.length})</span>
					</div>
					<div className="demo-pane__body console-panel">
						{bookmarks.length === 0 ? (
							<div className="console-panel__empty">
								<span>No bookmarks yet.</span>
								<span className="console-panel__empty-hint">
									Select a frame and click &quot;Bookmark&quot;.
								</span>
							</div>
						) : (
							bookmarks.map((bm) => (
								<div key={bm.id} className="console-entry">
									<div className="console-entry__header">
										<span className="console-entry__title">{bm.label}</span>
										<span className="console-entry__render">frame {bm.frameIndex}</span>
									</div>
								</div>
							))
						)}
						{log.map((entry, i) => (
							<div key={i} className="console-entry">
								<div className="console-section">
									<div className="console-section__line console-section__line--added">
										<span className="console-line__added">{entry}</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="scenario-controls">
				<button className="btn btn--primary" onClick={addBookmark}>
					Bookmark frame {cursor.frameIndex}
				</button>
				<button
					className="btn btn--ghost btn--sm"
					onClick={updateBookmark}
					disabled={bookmarkIdRef.current === null}
				>
					Update label
				</button>
				<button
					className="btn btn--ghost btn--sm"
					onClick={jumpToBookmark}
					disabled={bookmarkIdRef.current === null}
				>
					Jump to bookmark
				</button>
				<button
					className="btn btn--ghost btn--sm"
					onClick={removeBookmark}
					disabled={bookmarkIdRef.current === null}
				>
					Remove
				</button>
			</div>
		</div>
	);
};

const PresetExplorerPanel = () => {
	const events = useMemo(() => buildSyntheticEvents(), []);
	const engine = useMemo(() => createReplayEngine(fromEvents(events)), [events]);

	const presetResults = useMemo(
		() =>
			PRESETS.map((preset) => ({
				preset,
				count: applyPreset(engine.session, preset).matchingFrameCount,
			})),
		[engine],
	);

	return (
		<div className="scenario-body">
			<div className="demo-pane">
				<div className="demo-pane__header">
					<span className="demo-pane__title">
						Preset Results ({engine.session.frameCount} total frames)
					</span>
				</div>
				<div className="demo-pane__body console-panel">
					{presetResults.map(({ preset, count }) => (
						<div key={preset} className="console-entry">
							<div className="console-entry__header">
								<span className="console-entry__title">{preset}</span>
								<span className="console-entry__meta">
									<span
										className={`console-entry__badge ${count > 0 ? 'console-entry__badge--warn' : 'console-entry__badge--ok'}`}
									>
										{count} frame{count !== 1 ? 's' : ''}
									</span>
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

const MultiSessionPanel = () => {
	const eventsA = useMemo(() => buildSyntheticEvents('ComponentA'), []);
	const eventsB = useMemo(() => buildSyntheticEvents('ComponentB'), []);
	const mergedEvents = useMemo(() => [...eventsA, ...eventsB], [eventsA, eventsB]);
	const source = useMemo(() => fromEvents(mergedEvents), [mergedEvents]);

	const sessions = useMemo(() => buildReplaySessions(source), [source]);

	const engineA = useMemo(
		() => createReplayEngine(source, sessions[0]?.id),
		[source, sessions],
	);
	const engineB = useMemo(
		() => createReplayEngine(source, sessions[1]?.id),
		[source, sessions],
	);

	return (
		<div className="scenario-body">
			<div className="demo-grid">
				{[engineA, engineB].map((engine, idx) => (
					<div key={idx} className="demo-pane">
						<div className="demo-pane__header">
							<span className="demo-pane__title">
								Session {idx + 1} — {engine.session.componentName}
							</span>
						</div>
						<div
							className="demo-pane__body"
							style={{ padding: '12px 16px', gap: 8, display: 'flex', flexDirection: 'column' }}
						>
							<div className="prop-row">
								<span className="prop-row__key">frameCount</span>
								<span className="prop-row__value prop-row__value--number">
									{engine.session.frameCount}
								</span>
							</div>
							<div className="prop-row">
								<span className="prop-row__key">avgScore</span>
								<span className="prop-row__value prop-row__value--number">
									{engine.session.stats.averageScore !== null
										? engine.session.stats.averageScore.toFixed(1)
										: '—'}
								</span>
							</div>
							<div className="prop-row">
								<span className="prop-row__key">ineffective renders</span>
								<span className="prop-row__value prop-row__value--number">
									{engine.session.stats.ineffectiveRenderCount}
								</span>
							</div>
							<div className="prop-row">
								<span className="prop-row__key">unstable props</span>
								<span className="prop-row__value">
									{engine.session.stats.unstablePropNames.join(', ') || 'none'}
								</span>
							</div>
							<div className="prop-row">
								<span className="prop-row__key">issues-only frames</span>
								<span className="prop-row__value prop-row__value--number">
									{engine.applyPreset('issues-only').matchingFrameCount}
								</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

// ── Scenario tabs ──────────────────────────────────────────────────────────────

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

const ScenarioPanel = ({ scenario }: { scenario: Scenario }) => {
	if (scenario.id === 'basic-replay') return <BasicReplayPanel />;
	if (scenario.id === 'filter-issues') return <FilterIssuesPanel />;
	if (scenario.id === 'bookmarks') return <BookmarksPanel />;
	if (scenario.id === 'preset-explorer') return <PresetExplorerPanel />;
	if (scenario.id === 'multi-session') return <MultiSessionPanel />;
	return null;
};

// ── Root export ────────────────────────────────────────────────────────────────

export const RenderReplayEngineDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('basic-replay');
	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	return (
		<>
			<ScenarioTabs active={activeId} onChange={setActiveId} />

			<div className="scenario-header">
				<span className={`scenario-badge scenario-badge--${activeScenario.badge}`}>
					{activeScenario.badge === 'warn' ? '⚠ issues visible' : '✓ healthy'}
				</span>
				<p className="scenario-description">{activeScenario.description}</p>
			</div>

			<ScenarioPanel key={activeId} scenario={activeScenario} />

			<details className="code-hint code-hint--usage">
				<summary>How to use render-replay-engine</summary>
				<div className="code-hint__body">
					<pre className="code-hint__pre">{`import {
  createReplayEngine,
  buildReplaySessions,
  fromEvents,
  fromBuffer,
  fromSerialized,
  applyPreset,
} from '@sapanmozammel/render-replay-engine';

// 1. Build engine from any source
const engine = createReplayEngine(fromEvents(events));
// or: fromBuffer(telemetryBuffer), fromSerialized(jsonString)

// 2. Navigate with immutable cursors
let cursor = engine.navigate.atStart();
cursor = engine.navigate.next(cursor) ?? cursor;
cursor = engine.navigate.jumpToRender(cursor, 5) ?? cursor;

// 3. Read the current frame
const frame = engine.getFrame(cursor.frameIndex);
// frame.score, frame.signalKind, frame.hasUnstableProps
// frame.propChangeEvent?.changed, frame.propChangeEvent?.unstable

// 4. Filter to frames of interest
const result = engine.applyPreset('issues-only');
// result.matchingFrameCount, result.matchingFrameIndices
const next = engine.navigate.nextMatching(cursor, { maxScore: 69 });

// 5. Bookmark frames
const bm = engine.bookmarks.create({
  frameIndex: cursor.frameIndex,
  sessionId: engine.session.id,
  label: 'Investigate this render',
});
engine.navigate.jumpToBookmark(bm.id);

// 6. Multi-session: inspect all sessions, then pick one
const sessions = buildReplaySessions(fromBuffer(buffer));
const engine2 = createReplayEngine(fromBuffer(buffer), sessions[0].id);`}</pre>
					<p className="code-hint__note">
						Pure TypeScript, zero runtime dependencies. Works in any environment — no React peer
						dependency. Pair with render-telemetry-core to capture events from live components.
					</p>
				</div>
			</details>
		</>
	);
};
