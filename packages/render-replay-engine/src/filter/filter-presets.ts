import type { ReplaySession, ReplayFilterPreset, ReplayFilterResult } from '../types/index.js';
import { applyFilter } from './filter.js';

// union of two filter passes, deduplicates and sorts indices
const unionFilter = (result1: ReplayFilterResult, result2: ReplayFilterResult): ReplayFilterResult => {
	const combined = new Set([...result1.matchingFrameIndices, ...result2.matchingFrameIndices]);
	const sorted = Object.freeze([...combined].sort((a, b) => a - b));
	return Object.freeze<ReplayFilterResult>({
		filter: result1.filter,
		matchingFrameIndices: sorted,
		matchingFrameCount: sorted.length,
		totalFrameCount: result1.totalFrameCount,
	});
};

export const applyPreset = (session: ReplaySession, preset: ReplayFilterPreset): ReplayFilterResult => {
	switch (preset) {
		case 'issues-only': {
			// OR semantics: score < 70 OR has unstable props (cannot express as single AND filter)
			const byScore = applyFilter(session, { maxScore: 69 });
			const byUnstable = applyFilter(session, { hasUnstablePropsOnly: true });
			return unionFilter(byScore, byUnstable);
		}
		case 'score-degradation': {
			// frames where score < preceding frame's score
			const indices: number[] = [];
			for (let i = 1; i < session.frames.length; i++) {
				const prev = session.frames[i - 1]!;
				const curr = session.frames[i]!;
				if (curr.score !== null && prev.score !== null && curr.score < prev.score) {
					indices.push(curr.frameIndex);
				}
			}
			return Object.freeze<ReplayFilterResult>({
				filter: {},
				matchingFrameIndices: Object.freeze(indices),
				matchingFrameCount: indices.length,
				totalFrameCount: session.frameCount,
			});
		}
		case 'reference-instability':
			return applyFilter(session, { signalKinds: ['reference-only', 'mixed'] });
		case 'high-frequency':
			return applyFilter(session, { frequencyClasses: ['HIGH'] });
		case 'ineffective-memo':
			return applyFilter(session, { memoClassifications: ['INEFFECTIVE'] });
		case 'prop-changes-only':
			return applyFilter(session, { signalKinds: ['genuine', 'mixed', 'reference-only'] });
		case 'parent-triggered-only':
			return applyFilter(session, { triggeredBy: ['parent'] });
	}
};
