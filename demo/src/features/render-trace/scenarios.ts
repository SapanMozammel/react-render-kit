export type ScenarioId = 'cascade' | 'deep' | 'memo' | 'roots';
export type ScenarioBadge = 'warn' | 'ok';

export type Scenario = {
	readonly id: ScenarioId;
	readonly label: string;
	readonly description: string;
	readonly badge: ScenarioBadge;
};

export const SCENARIOS: readonly Scenario[] = [
	{
		id: 'cascade',
		label: 'Cascade Chain',
		description:
			'A parent state update propagates through three instrumented levels. Watch the console to see the propagation tree — root trigger, depth, and all nodes in one cycle.',
		badge: 'warn',
	},
	{
		id: 'deep',
		label: 'Deep Cascade',
		description:
			'Five instrumented levels in a linear chain. Each click adds another render cascade. The cycle depth climbs with every extra level you add to the tree.',
		badge: 'warn',
	},
	{
		id: 'memo',
		label: 'Memo Firewall',
		description:
			'Toggle React.memo on the child component. Without memo the cascade propagates to depth 1. With memo, the child skips re-rendering — the cycle shows depth 0 and only the parent.',
		badge: 'ok',
	},
	{
		id: 'roots',
		label: 'Source Detection',
		description:
			'Two independent component trees respond to separate buttons. Each trigger produces its own cycle with a distinct root trigger. Check the console — each log identifies the correct source.',
		badge: 'warn',
	},
];
