import React from 'react';
import { severityColors, tokens } from '../styles/tokens.js';
import type { Recommendation, RecommendationEvidence } from '../types/index.js';

type RecommendationCardProps = {
	recommendation: Recommendation;
};

const evidenceChip = (e: RecommendationEvidence, idx: number): React.ReactElement => {
	if (e.type === 'unstable-prop') {
		return (
			<span
				key={idx}
				style={{
					display: 'inline-block',
					padding: '1px 5px',
					borderRadius: '3px',
					fontSize: '10px',
					fontFamily: tokens.fontMono,
					backgroundColor: tokens.surface2,
					color: tokens.textMuted,
					border: `1px solid ${tokens.border}`,
					marginRight: '4px',
					marginTop: '2px',
				}}
			>
				{e.propName} ({e.refType} · {e.occurrences}×)
			</span>
		);
	}
	if (e.type === 'render-pattern') {
		return (
			<span
				key={idx}
				style={{
					display: 'inline-block',
					padding: '1px 5px',
					borderRadius: '3px',
					fontSize: '10px',
					fontFamily: tokens.fontMono,
					backgroundColor: tokens.surface2,
					color: tokens.textMuted,
					border: `1px solid ${tokens.border}`,
					marginRight: '4px',
					marginTop: '2px',
				}}
			>
				{e.pattern} · {e.renderCount} renders
			</span>
		);
	}
	if (e.type === 'frequency-measurement') {
		return (
			<span
				key={idx}
				style={{
					display: 'inline-block',
					padding: '1px 5px',
					borderRadius: '3px',
					fontSize: '10px',
					fontFamily: tokens.fontMono,
					backgroundColor: tokens.surface2,
					color: tokens.textMuted,
					border: `1px solid ${tokens.border}`,
					marginRight: '4px',
					marginTop: '2px',
				}}
			>
				{e.ratePerSecond.toFixed(1)}/s · {e.classification}
			</span>
		);
	}
	return (
		<span
			key={idx}
			style={{
				display: 'inline-block',
				padding: '1px 5px',
				borderRadius: '3px',
				fontSize: '10px',
				fontFamily: tokens.fontMono,
				backgroundColor: tokens.surface2,
				color: tokens.textMuted,
				border: `1px solid ${tokens.border}`,
				marginRight: '4px',
				marginTop: '2px',
			}}
		>
			{e.type === 'memo-session' ? `${e.sessionClass}` : e.type === 'score-component' ? `${e.label}: −${e.penalty}` : ''}
		</span>
	);
};

export const RecommendationCard = ({ recommendation: rec }: RecommendationCardProps): React.ReactElement => {
	const [expanded, setExpanded] = React.useState(rec.severity !== 'INFO');
	const color = severityColors[rec.severity];

	return (
		<div
			style={{
				borderLeft: `3px solid ${color}`,
				padding: '8px 10px',
				marginBottom: '6px',
				backgroundColor: tokens.surface2,
				borderRadius: '0 4px 4px 0',
			}}
		>
			<button
				onClick={() => setExpanded((v) => !v)}
				aria-expanded={expanded}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '6px',
					background: 'none',
					border: 'none',
					padding: 0,
					cursor: 'pointer',
					width: '100%',
					textAlign: 'left',
				}}
			>
				<span style={{ color, fontSize: '10px', fontWeight: 'bold', fontFamily: tokens.fontMono }}>● {rec.severity}</span>
				<span
					style={{
						color: tokens.text,
						fontSize: '11px',
						fontFamily: tokens.fontMono,
						fontWeight: 'bold',
						flex: 1,
					}}
				>
					{rec.title}
				</span>
				<span style={{ color: tokens.textMuted, fontSize: '10px' }}>{expanded ? '▲' : '▼'}</span>
			</button>

			{expanded && (
				<div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
					<p
						style={{
							margin: 0,
							fontSize: '11px',
							fontFamily: tokens.fontMono,
							color: tokens.textMuted,
							lineHeight: '1.5',
						}}
					>
						{rec.explanation}
					</p>

					<p style={{ margin: 0, fontSize: '11px', fontFamily: tokens.fontMono }}>
						<span style={{ color: tokens.accent }}>Fix: </span>
						<span style={{ color: tokens.text }}>{rec.fix}</span>
					</p>

					<p style={{ margin: 0, fontSize: '11px', fontFamily: tokens.fontMono }}>
						<span style={{ color: tokens.textMuted }}>Impact: </span>
						<span style={{ color: tokens.text }}>{rec.expectedImpact}</span>
					</p>

					{rec.evidence.length > 0 && <div style={{ marginTop: '2px' }}>{rec.evidence.map((e, i) => evidenceChip(e, i))}</div>}
				</div>
			)}
		</div>
	);
};
