import type { ReplaySession, ReplayFilter, ReplayFilterResult, ReplayFrame } from '../types/index.js';

// exported for use by navigator's nextMatching / previousMatching
export const frameMatchesFilter = (frame: ReplayFrame, filter: ReplayFilter): boolean => {
	// cheapest checks first
	if (filter.frameIndexRange !== undefined) {
		const [lo, hi] = filter.frameIndexRange;
		if (frame.frameIndex < lo || frame.frameIndex > hi) return false;
	}
	if (filter.timestampRange !== undefined) {
		const [lo, hi] = filter.timestampRange;
		if (frame.wallTimestamp < lo || frame.wallTimestamp > hi) return false;
	}
	if (filter.relativeMsRange !== undefined) {
		const [lo, hi] = filter.relativeMsRange;
		if (frame.relativeMs < lo || frame.relativeMs > hi) return false;
	}
	if (filter.triggeredBy !== undefined) {
		if (!filter.triggeredBy.includes(frame.triggeredBy)) return false;
	}
	if (filter.hasUnstablePropsOnly === true && !frame.hasUnstableProps) return false;
	if (filter.hasUnstablePropsOnly === false && frame.hasUnstableProps) return false;
	if (filter.hasRecommendationsOnly === true && frame.recommendationCount === 0) return false;
	if (filter.hasRecommendationsOnly === false && frame.recommendationCount > 0) return false;
	if (filter.grades !== undefined && frame.grade !== null) {
		if (!filter.grades.includes(frame.grade)) return false;
	}
	if (filter.minScore !== undefined && (frame.score === null || frame.score < filter.minScore)) return false;
	if (filter.maxScore !== undefined && (frame.score === null || frame.score > filter.maxScore)) return false;
	if (filter.memoClassifications !== undefined && frame.memoClassification !== null) {
		if (!filter.memoClassifications.includes(frame.memoClassification)) return false;
	}
	if (filter.frequencyClasses !== undefined && frame.frequencyClass !== null) {
		if (!filter.frequencyClasses.includes(frame.frequencyClass)) return false;
	}
	if (filter.signalKinds !== undefined && frame.signalKind !== null) {
		if (!filter.signalKinds.includes(frame.signalKind)) return false;
	}
	if (filter.componentNames !== undefined) {
		if (!filter.componentNames.includes(frame.componentName)) return false;
	}
	return true;
};

export const applyFilter = (session: ReplaySession, filter: ReplayFilter): ReplayFilterResult => {
	const matchingFrameIndices = session.frames.filter((frame) => frameMatchesFilter(frame, filter)).map((frame) => frame.frameIndex);

	return Object.freeze<ReplayFilterResult>({
		filter,
		matchingFrameIndices: Object.freeze(matchingFrameIndices),
		matchingFrameCount: matchingFrameIndices.length,
		totalFrameCount: session.frameCount,
	});
};

export const mergeFilters = (a: ReplayFilter, b: ReplayFilter): ReplayFilter => {
	const result: ReplayFilter = {};
	// for array fields: union values if both defined, else take whichever is defined
	const names = b.componentNames ?? a.componentNames;
	if (names !== undefined) Object.assign(result, { componentNames: names });

	const minScore = b.minScore !== undefined && a.minScore !== undefined ? Math.max(a.minScore, b.minScore) : (b.minScore ?? a.minScore);
	if (minScore !== undefined) Object.assign(result, { minScore });

	const maxScore = b.maxScore !== undefined && a.maxScore !== undefined ? Math.min(a.maxScore, b.maxScore) : (b.maxScore ?? a.maxScore);
	if (maxScore !== undefined) Object.assign(result, { maxScore });

	const grades = b.grades && a.grades ? Object.freeze([...new Set([...a.grades, ...b.grades])]) : (b.grades ?? a.grades);
	if (grades !== undefined) Object.assign(result, { grades });

	const memos = b.memoClassifications && a.memoClassifications ? Object.freeze([...new Set([...a.memoClassifications, ...b.memoClassifications])]) : (b.memoClassifications ?? a.memoClassifications);
	if (memos !== undefined) Object.assign(result, { memoClassifications: memos });

	const freqs = b.frequencyClasses && a.frequencyClasses ? Object.freeze([...new Set([...a.frequencyClasses, ...b.frequencyClasses])]) : (b.frequencyClasses ?? a.frequencyClasses);
	if (freqs !== undefined) Object.assign(result, { frequencyClasses: freqs });

	const signals = b.signalKinds && a.signalKinds ? Object.freeze([...new Set([...a.signalKinds, ...b.signalKinds])]) : (b.signalKinds ?? a.signalKinds);
	if (signals !== undefined) Object.assign(result, { signalKinds: signals });

	const unstable = b.hasUnstablePropsOnly ?? a.hasUnstablePropsOnly;
	if (unstable !== undefined) Object.assign(result, { hasUnstablePropsOnly: unstable });

	const recs = b.hasRecommendationsOnly ?? a.hasRecommendationsOnly;
	if (recs !== undefined) Object.assign(result, { hasRecommendationsOnly: recs });

	const triggered = b.triggeredBy && a.triggeredBy ? Object.freeze([...new Set([...a.triggeredBy, ...b.triggeredBy])]) : (b.triggeredBy ?? a.triggeredBy);
	if (triggered !== undefined) Object.assign(result, { triggeredBy: triggered });

	const fi = b.frameIndexRange ?? a.frameIndexRange;
	if (fi !== undefined) Object.assign(result, { frameIndexRange: fi });

	const ts = b.timestampRange ?? a.timestampRange;
	if (ts !== undefined) Object.assign(result, { timestampRange: ts });

	const rm = b.relativeMsRange ?? a.relativeMsRange;
	if (rm !== undefined) Object.assign(result, { relativeMsRange: rm });

	return result;
};

export const withFilter = (base: ReplayFilter, addition: Partial<ReplayFilter>): ReplayFilter => mergeFilters(base, addition as ReplayFilter);
