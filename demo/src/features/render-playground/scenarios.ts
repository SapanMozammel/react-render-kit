export type ScenarioId =
	| 'well-optimized'
	| 'unstable-callbacks'
	| 'unstable-objects'
	| 'memo-defeated'
	| 'high-frequency';

export type ScenarioBadge = 'ok' | 'warn';

export type Scenario = {
	readonly id: ScenarioId;
	readonly label: string;
	readonly description: string;
	readonly badge: ScenarioBadge;
	readonly triggerLabel: string;
};

export const SCENARIOS: readonly Scenario[] = [
	{
		id: 'well-optimized',
		label: 'Well Optimized',
		description:
			'All reference props are stable — useCallback for functions, useMemo for objects. The panel shows a high score, EFFECTIVE memo, and the R-CLEAR-001 "well-optimized" recommendation.',
		badge: 'ok',
		triggerLabel: 'Change data',
	},
	{
		id: 'unstable-callbacks',
		label: 'Inline Callbacks',
		description:
			'Three functions are defined inline — new references on every parent render. The panel surfaces R-FUNC-001 (HIGH/CRITICAL), shows unstable props in the prop diff table, and penalizes the score.',
		badge: 'warn',
		triggerLabel: 'Re-render parent',
	},
	{
		id: 'unstable-objects',
		label: 'Inline Objects',
		description:
			'Config and tags are declared inline — fresh object/array references each render. R-OBJ-001 and R-ARR-001 fire. Score is penalized for instability and INEFFECTIVE memo.',
		badge: 'warn',
		triggerLabel: 'Re-render parent',
	},
	{
		id: 'memo-defeated',
		label: 'Memo Defeated',
		description:
			'Mix of unstable functions, objects, and arrays — all reference-only renders. R-MEMO-001 fires at CRITICAL once 3+ reference-only renders accumulate. Score tanks below 40.',
		badge: 'warn',
		triggerLabel: 'Re-render parent',
	},
	{
		id: 'high-frequency',
		label: 'High Frequency',
		description:
			'Rapid re-renders push frequency class to HIGH. R-FREQ-001 fires at HIGH severity. After several renders R-SCORE-001 may fire if the score trend degrades.',
		badge: 'warn',
		triggerLabel: 'Rapid re-renders',
	},
];
