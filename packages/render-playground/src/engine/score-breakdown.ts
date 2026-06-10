import type { InsightReport } from '@sapanmozammel/render-insights';
import type { ScoreBreakdown, ScoreComponent } from '../types/index.js';

const FREQUENCY_PENALTY: Record<string, number> = {
	LOW: 0,
	NOT_ENOUGH_DATA: 0,
	MODERATE: 10,
	HIGH: 25,
};

const MEMO_PENALTY: Record<string, number> = {
	NOT_APPLICABLE: 0,
	EFFECTIVE: 0,
	PARTIALLY_EFFECTIVE: 15,
	INEFFECTIVE: 30,
};

export const computeScoreBreakdown = (report: InsightReport): ScoreBreakdown => {
	const frequencyPenalty = FREQUENCY_PENALTY[report.frequency.classification] ?? 0;
	const instabilityPenalty = Math.min(report.props.unstable.length * 8, 30);
	const memoPenalty = MEMO_PENALTY[report.memo.sessionClass] ?? 0;
	const mixedSignalPenalty = Math.min(report.memo.mixedCount * 3, 15);
	const total = Math.max(0, 100 - frequencyPenalty - instabilityPenalty - memoPenalty - mixedSignalPenalty);

	const components: ScoreComponent[] = [
		{
			label: 'Frequency',
			penalty: frequencyPenalty,
			explanation:
				frequencyPenalty === 0
					? `${report.frequency.classification} frequency — no penalty`
					: `${report.frequency.classification} frequency class (−${frequencyPenalty} pts)`,
		},
		{
			label: 'Prop Instability',
			penalty: instabilityPenalty,
			explanation:
				instabilityPenalty === 0
					? 'No unstable props — no penalty'
					: `${report.props.unstable.length} unstable prop${report.props.unstable.length > 1 ? 's' : ''} × 8 = −${instabilityPenalty} pts${instabilityPenalty === 30 ? ' (capped)' : ''}`,
		},
		{
			label: 'Memo Effectiveness',
			penalty: memoPenalty,
			explanation:
				memoPenalty === 0
					? `${report.memo.sessionClass} — no penalty`
					: `${report.memo.sessionClass} session −${memoPenalty} pts`,
		},
		{
			label: 'Mixed Signals',
			penalty: mixedSignalPenalty,
			explanation:
				mixedSignalPenalty === 0
					? 'No mixed renders in window'
					: `${report.memo.mixedCount} mixed render${report.memo.mixedCount > 1 ? 's' : ''} × 3 = −${mixedSignalPenalty} pts${mixedSignalPenalty === 15 ? ' (capped)' : ''}`,
		},
	];

	return { total, frequencyPenalty, instabilityPenalty, memoPenalty, mixedSignalPenalty, components };
};
