import React from 'react';
import type { InsightReport } from '@sapanmozammel/render-insights';
import { tokens } from '../styles/tokens.js';

type MemoClassification = InsightReport['memo']['sessionClass'];

type MemoBadgeProps = {
	classification: MemoClassification;
};


const badgeColor: Record<MemoClassification, string> = {
	NOT_APPLICABLE: tokens.textMuted,
	EFFECTIVE: tokens.green,
	PARTIALLY_EFFECTIVE: tokens.yellow,
	INEFFECTIVE: tokens.red,
};

const badgeLabel: Record<MemoClassification, string> = {
	NOT_APPLICABLE: 'N/A',
	EFFECTIVE: 'Effective',
	PARTIALLY_EFFECTIVE: 'Partial',
	INEFFECTIVE: 'Ineffective',
};

export const MemoBadge = ({ classification }: MemoBadgeProps): React.ReactElement => {
	const color = badgeColor[classification];
	return (
		<span
			style={{
				display: 'inline-block',
				padding: '1px 6px',
				borderRadius: '4px',
				fontSize: '10px',
				fontFamily: tokens.fontMono,
				fontWeight: 'bold',
				color,
				border: `1px solid ${color}`,
				backgroundColor: `${color}22`,
				textTransform: 'uppercase',
				letterSpacing: '0.04em',
			}}
		>
			{badgeLabel[classification]}
		</span>
	);
};
