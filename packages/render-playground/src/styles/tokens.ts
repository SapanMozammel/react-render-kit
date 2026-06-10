export const tokens = {
	bg: '#0f0f0f',
	surface: '#161616',
	surface2: '#1c1c1c',
	border: '#2a2a2a',
	text: '#ededed',
	textMuted: '#888888',
	accent: '#5a9cf8',
	green: '#4ade80',
	orange: '#fb923c',
	yellow: '#eab308',
	red: '#f87171',
	purple: '#a78bfa',
	blue: '#60a5fa',
	fontMono: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, monospace',
} as const;

export const severityColors = {
	CRITICAL: '#f87171',
	HIGH: '#fb923c',
	MEDIUM: '#eab308',
	LOW: '#5a9cf8',
	INFO: '#888888',
} as const;

export const gradeColors = {
	EXCELLENT: '#4ade80',
	GOOD: '#60a5fa',
	MODERATE: '#eab308',
	POOR: '#fb923c',
	CRITICAL: '#f87171',
} as const;

export const signalColors = {
	genuine: '#4ade80',
	'reference-only': '#fb923c',
	mixed: '#eab308',
	null: '#3a3a3a',
} as const;
