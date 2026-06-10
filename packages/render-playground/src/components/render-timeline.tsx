import React from 'react';
import type { InsightReport } from '@sapanmozammel/render-insights';
import { signalColors, tokens } from '../styles/tokens.js';

type RenderTimelineProps = {
	reports: readonly InsightReport[];
	maxVisible?: number;
};

const signalLabel = (report: InsightReport): string => {
	const kind = report.memo.signalKind;
	if (kind === null) return `Render #${report.renderNumber}: no-prop-change`;
	return `Render #${report.renderNumber}: ${kind}`;
};

const pillColor = (report: InsightReport): string => {
	const kind = report.memo.signalKind;
	if (kind === null) return signalColors.null;
	return signalColors[kind] ?? signalColors.null;
};

export const RenderTimeline = ({ reports, maxVisible = 50 }: RenderTimelineProps): React.ReactElement => {
	const visible = reports.slice(-maxVisible);

	return (
		<div>
			<div
				style={{
					fontSize: '10px',
					color: tokens.textMuted,
					fontFamily: tokens.fontMono,
					marginBottom: '4px',
					textTransform: 'uppercase',
					letterSpacing: '0.05em',
				}}
			>
				Render Timeline
			</div>
			<div
				role="list"
				aria-label="Render timeline"
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: '2px',
					overflowX: 'auto',
					padding: '4px 0',
				}}
			>
				{visible.map((report) => (
					<div
						key={`${report.renderNumber}-${report.reportNumber}`}
						role="listitem"
						aria-label={signalLabel(report)}
						title={`${signalLabel(report)} · score: ${report.score}`}
						style={{
							width: '8px',
							height: '14px',
							borderRadius: '2px',
							backgroundColor: pillColor(report),
							flexShrink: 0,
						}}
					/>
				))}
			</div>
		</div>
	);
};
