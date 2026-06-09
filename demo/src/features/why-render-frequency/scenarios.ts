export type ScenarioId = 'typing' | 'render-loop' | 'parent-storm' | 'memo-comparison';
export type ScenarioBadge = 'warn' | 'ok';

export type Scenario = {
	readonly id: ScenarioId;
	readonly label: string;
	readonly description: string;
	readonly badge: ScenarioBadge;
};

export const SCENARIOS: readonly Scenario[] = [
	{
		id: 'typing',
		label: 'Typing Stress Test',
		description:
			'Every keystroke updates parent state, causing the child component to re-render on each character. Watch the frequency accumulate in the console.',
		badge: 'warn',
	},
	{
		id: 'render-loop',
		label: 'Render Loop Simulator',
		description:
			'A setInterval fires every 100 ms, continuously updating state and driving rapid re-renders. Start the loop and observe the console — rate will climb into High territory.',
		badge: 'warn',
	},
	{
		id: 'parent-storm',
		label: 'Parent State Storm',
		description:
			'Parent state updates cascade to child components even when the child data is unchanged. Both parent and child render counts increase on every click.',
		badge: 'warn',
	},
	{
		id: 'memo-comparison',
		label: 'Memo Comparison',
		description:
			'Two components side-by-side — one plain, one wrapped in React.memo. Trigger parent updates and watch only the plain component accumulate renders.',
		badge: 'ok',
	},
];
