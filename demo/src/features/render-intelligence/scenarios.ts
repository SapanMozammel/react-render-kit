export type ScenarioId =
	| 'bottleneck-ranking'
	| 'root-cause'
	| 'recommendations'
	| 'json-explorer';

export type ScenarioBadge = 'ok' | 'warn';

export type Scenario = {
	readonly id: ScenarioId;
	readonly label: string;
	readonly description: string;
	readonly badge: ScenarioBadge;
};

export const SCENARIOS: readonly Scenario[] = [
	{
		id: 'bottleneck-ranking',
		label: 'Bottleneck Ranking',
		description:
			'Feed a multi-component event stream into analyzeRenders() and inspect the ranked bottleneck list. Each entry shows the dominant problem category, impact score, and evidence backing the finding.',
		badge: 'warn',
	},
	{
		id: 'root-cause',
		label: 'Root Cause Analysis',
		description:
			'Inspect root causes detected across the application — memo-defeat, reference-instability, parent-cascade, and high-frequency-source. Each finding includes a causal chain explaining the exact failure path.',
		badge: 'warn',
	},
	{
		id: 'recommendations',
		label: 'Recommendations',
		description:
			'Browse the 15-rule recommendation engine output. Rules fire deterministically based on unstable props, frequency class, parent-triggered render ratio, correlation evidence, and application-level health.',
		badge: 'warn',
	},
	{
		id: 'json-explorer',
		label: 'JSON Explorer',
		description:
			'Inspect the full IntelligenceReport as structured JSON — schema version, application health, per-component analyses, bottlenecks, root causes, correlations, and recommendations in one serializable output.',
		badge: 'ok',
	},
];
