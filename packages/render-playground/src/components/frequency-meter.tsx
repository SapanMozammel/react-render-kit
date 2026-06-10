import React from 'react';
import type { InsightReport } from '@sapanmozammel/render-insights';
import { tokens } from '../styles/tokens.js';

type FrequencyMeterProps = {
	frequency: InsightReport['frequency'];
};

const classColor: Record<string, string> = {
	LOW: tokens.green,
	MODERATE: tokens.yellow,
	HIGH: tokens.orange,
	NOT_ENOUGH_DATA: tokens.textMuted,
};

export const FrequencyMeter = ({ frequency }: FrequencyMeterProps): React.ReactElement => {
	const color = classColor[frequency.classification] ?? tokens.textMuted;

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '6px',
				fontSize: '11px',
				fontFamily: tokens.fontMono,
			}}
		>
			<span style={{ color: tokens.textMuted }}>Frequency</span>
			<span style={{ color, fontWeight: 'bold' }}>{frequency.classification}</span>
			{frequency.classification !== 'NOT_ENOUGH_DATA' && <span style={{ color: tokens.textMuted }}>{frequency.rate.toFixed(1)}/s</span>}
		</div>
	);
};
