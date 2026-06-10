import React from 'react';
import { tokens } from '../styles/tokens.js';
import type { SessionStats } from '../types/index.js';

type SessionStripProps = {
	stats: SessionStats;
	totalReports: number;
};

const trendArrow = (trend: SessionStats['scoreTrend']): string => {
	if (trend === 'improving') return '↑';
	if (trend === 'degrading') return '↓';
	return '→';
};

const trendColor = (trend: SessionStats['scoreTrend']): string => {
	if (trend === 'improving') return tokens.green;
	if (trend === 'degrading') return tokens.red;
	return tokens.textMuted;
};

export const SessionStrip = ({ stats, totalReports }: SessionStripProps): React.ReactElement | null => {
	if (stats.windowSize < 3) return null;

	const arrow = trendArrow(stats.scoreTrend);
	const color = trendColor(stats.scoreTrend);

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
				padding: '4px 12px',
				backgroundColor: tokens.surface2,
				borderBottom: `1px solid ${tokens.border}`,
				fontSize: '10px',
				fontFamily: tokens.fontMono,
				color: tokens.textMuted,
			}}
		>
			<span>{totalReports} renders</span>
			<span style={{ color }}>
				{arrow} {stats.scoreTrend}
			</span>
			<span>avg {stats.averageScore}</span>
			{stats.mostUnstableProp !== null && (
				<span>
					most unstable: <span style={{ color: tokens.orange }}>{stats.mostUnstableProp}</span>
				</span>
			)}
		</div>
	);
};
