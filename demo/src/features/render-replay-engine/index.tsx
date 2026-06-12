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

const BADGE_OK = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-ok bg-ok-dim';
const BADGE_WARN = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-warn bg-warn-dim';
const BADGE_NEUTRAL = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-muted bg-elevated';

const scoreBadgeClass = (score: number): string => {
	if (score >= 80) return BADGE_OK;
	if (score >= 50) return BADGE_NEUTRAL;
	return BADGE_WARN;
};

const getUnstableNames = (frame: ReplayFrame): readonly string[] =>
	frame.propChangeEvent?.unstable.map((u) => u.name) ?? [];

const getChangedProps = (frame: ReplayFrame): ReadonlyArray<{ key: string; kind: string }> =>
	frame.propChangeEvent?.changed.map((c) => ({ key: c.key, kind: c.kind })) ?? [];

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
			className={`border-b border-edge py-2.5 last:border-b-0 cursor-pointer${isActive ? ' bg-elevated' : ''}`}
			onClick={onClick}
		>
			<div className="flex items-center justify-between mb-2">
				<span className="text-ink font-semibold">
					render #{frame.renderNumber}
					{frame.hasUnstableProps && (
						<span className={`${BADGE_WARN} ml-2`}>
							unstable
						</span>
					)}
				</span>
				<span className="flex items-center gap-2">
					<span className={scoreBadgeClass(frame.score ?? 100)}>
						{frame.score !== null ? `${frame.score}/100` : '—'}
					</span>
					<span className="text-dim text-[11px]">{frame.triggeredBy}</span>
				</span>
			</div>
			{(changedProps.length > 0 || unstableNames.length > 0) && (
				<div className="mb-1.5">
					{changedProps.slice(0, 3).map((p, i) => (
						<div key={i} className="flex gap-3 py-px pl-2 border-l-2 border-ok">
							<span className="text-muted min-w-20 shrink-0">{p.key}</span>
							<span className="text-ok break-all">{p.kind}</span>
						</div>
					))}
					{unstableNames.map((n, i) => (
						<div key={i} className="flex gap-3 py-px pl-2 border-l-2 border-purple">
							<span className="text-muted min-w-20 shrink-0">{n}</span>
							<span className="text-warn break-all">unstable ref</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

type StatsPanelProps = {
	engine: ReplayEngine;
	cursor: ReplayCursor;
};

const StatsPanel = ({ engine, cursor }: StatsPanelProps) => {
	const { stats } = engine.session;
	const frame = engine.getFrame(cursor.frameIndex);
	const unstableNames = frame ? getUnstableNames(frame) : [];

	return (
		<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
			<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
				<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">Current Frame</span>
				<span className="text-dim text-[11px]">
					{cursor.frameIndex + 1} / {engine.session.frameCount}
				</span>
			</div>
			<div className="p-3 flex flex-col gap-1.5 text-xs">
				{frame && (
					<>
						<div className="flex gap-3 py-0.75 text-[13px]">
							<span className="text-muted min-w-20 shrink-0">renderNumber</span>
							<span className="text-ink break-all">{frame.renderNumber}</span>
						</div>
						<div className="flex gap-3 py-0.75 text-[13px]">
							<span className="text-muted min-w-20 shrink-0">score</span>
							<span className={`break-all ${scoreBadgeClass(frame.score ?? 100)}`}>
								{frame.score !== null ? frame.score : '—'}
							</span>
						</div>
						<div className="flex gap-3 py-0.75 text-[13px]">
							<span className="text-muted min-w-20 shrink-0">triggeredBy</span>
							<span className="text-ink break-all">{frame.triggeredBy}</span>
						</div>
						<div className="flex gap-3 py-0.75 text-[13px]">
							<span className="text-muted min-w-20 shrink-0">unstableProps</span>
							<span className="text-ink break-all">
								{unstableNames.length > 0 ? unstableNames.join(', ') : 'none'}
							</span>
						</div>
					</>
				)}
				<hr className="my-2 border-edge" />
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">avgScore</span>
					<span className="text-ink break-all">
						{stats.averageScore !== null ? stats.averageScore.toFixed(1) : '—'}
					</span>
				</div>
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">ineffective</span>
					<span className="text-ink break-all">{stats.ineffectiveRenderCount}</span>
				</div>
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">unstable props</span>
					<span className="text-ink break-all">
						{stats.unstablePropNames.length > 0 ? stats.unstablePropNames.join(', ') : 'none'}
					</span>
				</div>
			</div>
		</div>
	);
};

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
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-5 items-start max-md:grid-cols-1">
				<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
					<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
						<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">Frames ({engine.session.frameCount})</span>
					</div>
					<div className="p-4 text-xs min-h-50">
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

			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-transparent bg-transparent text-muted text-[11px] hover:text-ink hover:bg-raised cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					onClick={goStart}
					disabled={cursor.frameIndex === 0}
				>
					⏮ Start
				</button>
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					onClick={goPrev}
					disabled={cursor.frameIndex === 0}
				>
					← Prev
				</button>
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					onClick={goNext}
					disabled={cursor.frameIndex === engine.session.frameCount - 1}
				>
					Next →
				</button>
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-transparent bg-transparent text-muted text-[11px] hover:text-ink hover:bg-raised cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-5 items-start max-md:grid-cols-1">
				<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
					<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
						<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">
							Issues Only ({result.matchingFrameCount}/{engine.session.frameCount} frames)
						</span>
					</div>
					<div className="p-4 text-xs min-h-50">
						{filteredFrames.length === 0 ? (
							<div className="py-6 text-center text-dim text-xs flex flex-col gap-1">
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

			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={jumpToPrevIssue}
				>
					← Prev issue
				</button>
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={jumpToNextIssue}
				>
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
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-5 items-start max-md:grid-cols-1">
				<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
					<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
						<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">Frames</span>
					</div>
					<div className="p-4 text-xs min-h-50">
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
				<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
					<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
						<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">Bookmarks ({bookmarks.length})</span>
					</div>
					<div className="p-4 text-xs min-h-50">
						{bookmarks.length === 0 && log.length === 0 ? (
							<div className="py-6 text-center text-dim text-xs flex flex-col gap-1">
								<span>No bookmarks yet.</span>
								<span className="text-[11px] opacity-70">Select a frame and click &quot;Bookmark&quot;.</span>
							</div>
						) : (
							<>
								{bookmarks.map((bm) => (
									<div key={bm.id} className="border-b border-edge py-2.5 last:border-b-0">
										<div className="flex items-center justify-between">
											<span className="text-ink font-semibold">{bm.label}</span>
											<span className="text-dim text-[11px]">frame {bm.frameIndex}</span>
										</div>
									</div>
								))}
								{log.map((entry, i) => (
									<div key={i} className="border-b border-edge py-2 last:border-b-0">
										<div className="flex gap-3 py-px pl-2 border-l-2 border-ok">
											<span className="text-ok break-all">{entry}</span>
										</div>
									</div>
								))}
							</>
						)}
					</div>
				</div>
			</div>

			<div className="flex gap-2 flex-wrap">
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={addBookmark}
				>
					Bookmark frame {cursor.frameIndex}
				</button>
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-transparent bg-transparent text-muted text-[11px] hover:text-ink hover:bg-raised cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					onClick={updateBookmark}
					disabled={bookmarkIdRef.current === null}
				>
					Update label
				</button>
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-transparent bg-transparent text-muted text-[11px] hover:text-ink hover:bg-raised cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					onClick={jumpToBookmark}
					disabled={bookmarkIdRef.current === null}
				>
					Jump to bookmark
				</button>
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-transparent bg-transparent text-muted text-[11px] hover:text-ink hover:bg-raised cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
		<div className="flex flex-col gap-4">
			<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
				<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
					<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">
						Preset Results ({engine.session.frameCount} total frames)
					</span>
				</div>
				<div className="p-4 text-xs min-h-50">
					{presetResults.map(({ preset, count }) => (
						<div key={preset} className="border-b border-edge py-2.5 last:border-b-0">
							<div className="flex items-center justify-between">
								<span className="text-ink font-semibold">{preset}</span>
								<span className={count > 0 ? BADGE_WARN : BADGE_OK}>
									{count} frame{count !== 1 ? 's' : ''}
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
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-5 items-start max-md:grid-cols-1">
				{[engineA, engineB].map((engine, idx) => (
					<div key={idx} className="bg-surface border border-edge rounded-[10px] overflow-hidden">
						<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
							<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">
								Session {idx + 1} — {engine.session.componentName}
							</span>
						</div>
						<div className="p-3 flex flex-col gap-1.5 text-xs">
							<div className="flex gap-3 py-0.75 text-[13px]">
								<span className="text-muted min-w-20 shrink-0">frameCount</span>
								<span className="text-ink break-all">{engine.session.frameCount}</span>
							</div>
							<div className="flex gap-3 py-0.75 text-[13px]">
								<span className="text-muted min-w-20 shrink-0">avgScore</span>
								<span className="text-ink break-all">
									{engine.session.stats.averageScore !== null
										? engine.session.stats.averageScore.toFixed(1)
										: '—'}
								</span>
							</div>
							<div className="flex gap-3 py-0.75 text-[13px]">
								<span className="text-muted min-w-20 shrink-0">ineffective</span>
								<span className="text-ink break-all">{engine.session.stats.ineffectiveRenderCount}</span>
							</div>
							<div className="flex gap-3 py-0.75 text-[13px]">
								<span className="text-muted min-w-20 shrink-0">unstable props</span>
								<span className="text-ink break-all">
									{engine.session.stats.unstablePropNames.join(', ') || 'none'}
								</span>
							</div>
							<div className="flex gap-3 py-0.75 text-[13px]">
								<span className="text-muted min-w-20 shrink-0">issues-only</span>
								<span className="text-ink break-all">
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

const ScenarioPanel = ({ scenario }: { scenario: Scenario }) => {
	if (scenario.id === 'basic-replay') return <BasicReplayPanel />;
	if (scenario.id === 'filter-issues') return <FilterIssuesPanel />;
	if (scenario.id === 'bookmarks') return <BookmarksPanel />;
	if (scenario.id === 'preset-explorer') return <PresetExplorerPanel />;
	if (scenario.id === 'multi-session') return <MultiSessionPanel />;
	return null;
};

export const RenderReplayEngineDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('basic-replay');
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
					{activeScenario.badge === 'warn' ? '⚠ issues visible' : '✓ healthy'}
				</span>
				<p className="text-[13px] text-muted max-w-150 leading-[1.7]">{activeScenario.description}</p>
			</div>

			<ScenarioPanel key={activeId} scenario={activeScenario} />

			<details className="border border-edge rounded-[10px] overflow-hidden group mt-2">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					How to use render-replay-engine
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import {
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
					<p className="text-xs text-dim leading-[1.6]">
						Pure TypeScript, zero runtime dependencies. Works in any environment — no React peer
						dependency. Pair with render-telemetry-core to capture events from live components.
					</p>
				</div>
			</details>
		</>
	);
};
