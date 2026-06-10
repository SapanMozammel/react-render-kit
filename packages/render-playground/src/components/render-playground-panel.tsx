import React from 'react';
import type { InsightReport } from '@sapanmozammel/render-insights';
import { PlaygroundContext } from '../context/playground-context.js';
import { computeRecommendations } from '../engine/recommendation-engine.js';
import { computeScoreBreakdown } from '../engine/score-breakdown.js';
import { computeSessionStats } from '../engine/session-stats.js';
import { tokens } from '../styles/tokens.js';
import type { PlaygroundStore, RenderPlaygroundPanelProps } from '../types/index.js';
import { FrequencyMeter } from './frequency-meter.js';
import { MemoBadge } from './memo-badge.js';
import { PropDiffTable } from './prop-diff-table.js';
import { RecommendationsSection } from './recommendations-section.js';
import { RenderTimeline } from './render-timeline.js';
import { ScoreBreakdownPanel } from './score-breakdown-panel.js';
import { ScoreGauge } from './score-gauge.js';
import { SessionStrip } from './session-strip.js';

const EMPTY_SNAPSHOT: readonly InsightReport[] = [];

const NOOP_STORE: PlaygroundStore = {
	subscribe: () => () => {},
	getSnapshot: () => EMPTY_SNAPSHOT,
	getServerSnapshot: () => EMPTY_SNAPSHOT,
	push: () => {},
	clear: () => {},
};

export const RenderPlaygroundPanel = ({ className, maxVisible = 50, onClear }: RenderPlaygroundPanelProps): React.ReactElement | null => {
	const contextStore = React.useContext(PlaygroundContext);
	const store = contextStore ?? NOOP_STORE;
	const reports = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

	// All hooks unconditionally before the production guard
	const latestReport = reports.at(-1) ?? null;
	const history = React.useMemo(
		() => (latestReport !== null ? reports.slice(0, -1) : reports),
		[reports, latestReport],
	);
	const recommendations = React.useMemo(
		() => (latestReport !== null ? computeRecommendations(latestReport, history) : []),
		[latestReport, history],
	);
	const breakdown = React.useMemo(
		() => (latestReport !== null ? computeScoreBreakdown(latestReport) : null),
		[latestReport],
	);
	const sessionStats = React.useMemo(() => computeSessionStats(reports), [reports]);

	if (process.env.NODE_ENV !== 'development') return null;

	const handleClear = () => {
		store.clear();
		onClear?.();
	};

	const componentName = latestReport?.componentName ?? '…';

	return (
		<div
			role='region'
			aria-label={`Render diagnostics for ${componentName}`}
			className={className}
			style={{
				backgroundColor: tokens.bg,
				border: `1px solid ${tokens.border}`,
				borderRadius: '8px',
				overflow: 'hidden',
				width: '360px',
				fontFamily: tokens.fontMono,
				color: tokens.text,
			}}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '8px 12px',
					backgroundColor: tokens.surface,
					borderBottom: `1px solid ${tokens.border}`,
				}}
			>
				<span style={{ fontSize: '11px', color: tokens.textMuted }}>
					[render-playground] <span style={{ color: tokens.text, fontWeight: 'bold' }}>&lt;{componentName}&gt;</span>
				</span>
				<button
					onClick={handleClear}
					aria-label='Clear render history'
					style={{
						background: 'none',
						border: `1px solid ${tokens.border}`,
						borderRadius: '3px',
						color: tokens.textMuted,
						cursor: 'pointer',
						fontSize: '10px',
						padding: '2px 6px',
						fontFamily: tokens.fontMono,
					}}
				>
					Clear
				</button>
			</div>

			{/* Session strip */}
			<SessionStrip stats={sessionStats} totalReports={reports.length} />

			{/* Empty state */}
			{latestReport === null && (
				<div
					style={{
						padding: '24px 12px',
						textAlign: 'center',
						color: tokens.textMuted,
						fontSize: '12px',
					}}
				>
					<p style={{ margin: '0 0 4px' }}>Trigger a render to see diagnostics.</p>
					<p style={{ margin: 0, fontSize: '10px' }}>No reports yet.</p>
				</div>
			)}

			{latestReport !== null && (
				<>
					{/* Timeline */}
					<div style={{ padding: '8px 12px', borderBottom: `1px solid ${tokens.border}` }}>
						<RenderTimeline reports={reports} maxVisible={maxVisible} />
					</div>

					{/* Score + Latest render split */}
					<div
						style={{
							display: 'flex',
							borderBottom: `1px solid ${tokens.border}`,
						}}
					>
						{/* Score gauge */}
						<div
							style={{
								padding: '12px',
								borderRight: `1px solid ${tokens.border}`,
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '4px',
								minWidth: '120px',
							}}
						>
							<ScoreGauge score={latestReport.score} grade={latestReport.grade} />
							<span style={{ fontSize: '11px', color: tokens.text, fontWeight: 'bold' }}>{latestReport.score} / 100</span>
							{breakdown !== null && <ScoreBreakdownPanel score={latestReport.score} breakdown={breakdown} />}
						</div>

						{/* Latest render detail */}
						<div
							style={{
								padding: '12px',
								flex: 1,
								display: 'flex',
								flexDirection: 'column',
								gap: '6px',
								fontSize: '11px',
								overflowX: 'hidden',
							}}
						>
							<div style={{ color: tokens.textMuted }}>
								Render <span style={{ color: tokens.text }}>#{latestReport.renderNumber}</span>
								{' · '}
								<span style={{ color: tokens.textMuted, fontSize: '10px' }}>{latestReport.inferredTrigger}</span>
							</div>

							<FrequencyMeter frequency={latestReport.frequency} />

							<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
								<span style={{ color: tokens.textMuted }}>Memo</span>
								<MemoBadge classification={latestReport.memo.sessionClass} />
							</div>

							{/* Prop diffs */}
							<div style={{ marginTop: '4px' }}>
								<PropDiffTable report={latestReport} />
							</div>
						</div>
					</div>

					{/* Recommendations */}
					{recommendations.length > 0 && (
						<div style={{ padding: '10px 12px', borderBottom: `1px solid ${tokens.border}` }}>
							<RecommendationsSection recommendations={recommendations} />
						</div>
					)}
				</>
			)}

			{/* Footer */}
			{latestReport !== null && (
				<div
					style={{
						padding: '4px 12px',
						backgroundColor: tokens.surface,
						fontSize: '10px',
						color: tokens.textMuted,
					}}
				>
					[render #{latestReport.renderNumber} of {reports.length} — score:v1]
				</div>
			)}
		</div>
	);
};
