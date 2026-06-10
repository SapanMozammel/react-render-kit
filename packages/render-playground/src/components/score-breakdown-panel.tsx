import React from 'react';
import { tokens } from '../styles/tokens.js';
import type { ScoreBreakdown } from '../types/index.js';

type ScoreBreakdownPanelProps = {
	score: number;
	breakdown: ScoreBreakdown;
};

export const ScoreBreakdownPanel = ({ score, breakdown }: ScoreBreakdownPanelProps): React.ReactElement => {
	const [open, setOpen] = React.useState(false);

	return (
		<div>
			<button
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-label={`Why ${score}?`}
				style={{
					background: 'none',
					border: 'none',
					padding: '2px 0',
					cursor: 'pointer',
					color: tokens.accent,
					fontFamily: tokens.fontMono,
					fontSize: '10px',
					textDecoration: 'underline',
				}}
			>
				[Why {score}?]
			</button>

			{open && (
				<div
					style={{
						marginTop: '4px',
						padding: '6px 8px',
						backgroundColor: tokens.surface2,
						borderRadius: '4px',
						border: `1px solid ${tokens.border}`,
					}}
				>
					{breakdown.components.map((c) => (
						<div
							key={c.label}
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								padding: '2px 0',
								fontSize: '10px',
								fontFamily: tokens.fontMono,
							}}
						>
							<span style={{ color: tokens.textMuted, minWidth: '120px' }}>{c.label}</span>
							<span
								style={{
									color: c.penalty > 0 ? tokens.orange : tokens.textMuted,
									minWidth: '30px',
									textAlign: 'right',
								}}
							>
								{c.penalty > 0 ? `−${c.penalty}` : '0'}
							</span>
							<span style={{ color: tokens.textMuted, marginLeft: '8px', flex: 1 }}>
								{c.explanation}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
