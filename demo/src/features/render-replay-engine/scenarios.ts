export type ScenarioId =
	| 'basic-replay'
	| 'filter-issues'
	| 'bookmarks'
	| 'preset-explorer'
	| 'multi-session';

export type ScenarioBadge = 'ok' | 'warn';

export type Scenario = {
	readonly id: ScenarioId;
	readonly label: string;
	readonly description: string;
	readonly badge: ScenarioBadge;
};

export const SCENARIOS: readonly Scenario[] = [
	{
		id: 'basic-replay',
		label: 'Basic Replay',
		description:
			'Build a ReplayEngine from a synthetic event sequence, then step through each frame with next() and previous(). See the immutable ReplayCursor advance through renderNumber, score, and prop changes.',
		badge: 'ok',
	},
	{
		id: 'filter-issues',
		label: 'Filter: Issues Only',
		description:
			'Apply the issues-only preset (OR semantics: score < 70 OR has unstable props) to find the subset of frames that need attention. Navigate with nextMatching() to jump directly to problematic renders.',
		badge: 'warn',
	},
	{
		id: 'bookmarks',
		label: 'Bookmarks',
		description:
			'Bookmark a frame, update its label, navigate to it by ID, then remove it. Demonstrates the in-memory BookmarkStore API — create, update, jumpToBookmark, remove.',
		badge: 'ok',
	},
	{
		id: 'preset-explorer',
		label: 'Preset Explorer',
		description:
			'Apply all 7 filter presets (issues-only, high-score, low-score, unstable-props, genuine-only, high-frequency, score-degradation) to the same session and see how many frames each preset matches.',
		badge: 'ok',
	},
	{
		id: 'multi-session',
		label: 'Multi-Session',
		description:
			'Build two independent sessions from a merged event stream using buildReplaySessions(), then select each with createReplayEngine(source, sessionId) and compare their stats side by side.',
		badge: 'ok',
	},
];
