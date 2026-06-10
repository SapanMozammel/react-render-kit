import React from 'react';
import { tokens } from '../styles/tokens.js';
import type { Recommendation } from '../types/index.js';
import { RecommendationCard } from './recommendation-card.js';

type RecommendationsSectionProps = {
	recommendations: Recommendation[];
};

const MAX_VISIBLE = 3;

export const RecommendationsSection = ({ recommendations }: RecommendationsSectionProps): React.ReactElement | null => {
	if (recommendations.length === 0) return null;

	const visible = recommendations.slice(0, MAX_VISIBLE);
	const remaining = recommendations.length - MAX_VISIBLE;

	return (
		<div>
			<div
				style={{
					fontSize: '10px',
					color: tokens.textMuted,
					fontFamily: tokens.fontMono,
					marginBottom: '6px',
					textTransform: 'uppercase',
					letterSpacing: '0.05em',
				}}
			>
				Recommendations
			</div>
			{visible.map((rec) => (
				<RecommendationCard key={rec.id} recommendation={rec} />
			))}
			{remaining > 0 && (
				<p
					style={{
						margin: 0,
						fontSize: '10px',
						color: tokens.textMuted,
						fontFamily: tokens.fontMono,
						fontStyle: 'italic',
					}}
				>
					+{remaining} more recommendation{remaining > 1 ? 's' : ''} — see full report
				</p>
			)}
		</div>
	);
};
