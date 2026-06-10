import React from 'react';
import type { InsightReport } from '@sapanmozammel/render-insights';
import { tokens } from '../styles/tokens.js';

type PropDiffTableProps = {
	report: InsightReport;
};

const safeStringify = (v: unknown): string => {
	if (v === undefined) return 'undefined';
	if (v === null) return 'null';
	try {
		return JSON.stringify(v);
	} catch {
		return '[circular]';
	}
};

export const PropDiffTable = ({ report }: PropDiffTableProps): React.ReactElement | null => {
	const { changed, unstable } = report.props;

	const hasChanged = changed.length > 0;
	const hasUnstable = unstable.length > 0;

	if (!hasChanged && !hasUnstable) return null;

	const rowStyle: React.CSSProperties = {
		display: 'flex',
		gap: '8px',
		padding: '3px 0',
		fontSize: '11px',
		fontFamily: tokens.fontMono,
		borderBottom: `1px solid ${tokens.border}`,
	};

	const labelStyle: React.CSSProperties = {
		color: tokens.textMuted,
		minWidth: '80px',
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
			{hasChanged && (
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
						Changed Props
					</div>
					{changed.map((entry) => {
						if (entry.kind === 'value-changed') {
							return (
								<div key={entry.key} style={rowStyle}>
									<span style={{ color: tokens.accent }}>{entry.key}</span>
									<span style={labelStyle}>{safeStringify(entry.prev)} → {safeStringify(entry.next)}</span>
								</div>
							);
						}
						if (entry.kind === 'reference-changed') {
							return (
								<div key={entry.key} style={rowStyle}>
									<span style={{ color: tokens.orange }}>{entry.key}</span>
									<span style={labelStyle}>new {entry.refType} reference</span>
								</div>
							);
						}
						if (entry.kind === 'added') {
							return (
								<div key={entry.key} style={rowStyle}>
									<span style={{ color: tokens.green }}>+ {entry.key}</span>
									<span style={labelStyle}>{safeStringify(entry.next)}</span>
								</div>
							);
						}
						// removed
						return (
							<div key={entry.key} style={rowStyle}>
								<span style={{ color: tokens.red }}>− {entry.key}</span>
								<span style={labelStyle}>{safeStringify(entry.prev)}</span>
							</div>
						);
					})}
				</div>
			)}

			{hasUnstable && (
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
						Unstable Props
					</div>
					{unstable.map((prop) => (
						<div key={prop.name} style={rowStyle}>
							<span style={{ color: tokens.orange }}>{prop.name}</span>
							<span style={labelStyle}>{prop.type}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
