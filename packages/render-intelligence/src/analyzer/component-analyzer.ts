import type {
	TelemetryEvent,
	RenderEvent,
	ScoreEvent,
	PropChangeEvent,
	FrequencyEvent,
	RecommendationEvent,
	SessionEndEvent,
	FrequencyClass,
	MemoClassification,
	HealthGrade,
	PropRefType,
} from '@sapanmozammel/render-core-schema';
import type { ComponentSessionData, ComponentAnalysis, ScoreTrend } from '../types/index.js';

const gradeFromScore = (score: number): HealthGrade => {
	if (score >= 90) return 'EXCELLENT';
	if (score >= 70) return 'GOOD';
	if (score >= 50) return 'MODERATE';
	if (score >= 30) return 'POOR';
	return 'CRITICAL';
};

const computeTrend = (scores: number[]): ScoreTrend => {
	if (scores.length < 4) return 'insufficient-data';
	const mid = Math.floor(scores.length / 2);
	const firstHalf = scores.slice(0, mid);
	const secondHalf = scores.slice(mid);
	const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
	const delta = avg(secondHalf) - avg(firstHalf);
	const spread = Math.max(...scores) - Math.min(...scores);
	if (spread > 40 && scores.length >= 6) return 'volatile';
	if (delta > 5) return 'improving';
	if (delta < -5) return 'degrading';
	return 'stable';
};

const frequencyClassRank: Record<FrequencyClass, number> = {
	HIGH: 3,
	MODERATE: 2,
	LOW: 1,
	NOT_ENOUGH_DATA: 0,
};

const worstFrequencyClass = (classes: FrequencyClass[]): FrequencyClass | null => {
	if (classes.length === 0) return null;
	return classes.reduce((worst, c) => (frequencyClassRank[c] > frequencyClassRank[worst] ? c : worst));
};

const majorityMemoClass = (classes: MemoClassification[]): MemoClassification | null => {
	if (classes.length === 0) return null;
	const counts = new Map<MemoClassification, number>();
	for (const c of classes) {
		counts.set(c, (counts.get(c) ?? 0) + 1);
	}
	let best: MemoClassification = 'NOT_APPLICABLE';
	let bestCount = 0;
	for (const [cls, count] of counts) {
		if (count > bestCount) {
			bestCount = count;
			best = cls;
		}
	}
	return best;
};

type SessionGroup = {
	sessionIds: string[];
	sessions: ComponentSessionData[];
};

const groupByComponent = (data: readonly ComponentSessionData[]): Map<string, SessionGroup> => {
	const groups = new Map<string, SessionGroup>();
	for (const item of data) {
		const existing = groups.get(item.componentName);
		if (existing !== undefined) {
			existing.sessionIds.push(item.sessionId);
			existing.sessions.push(item);
		} else {
			groups.set(item.componentName, {
				sessionIds: [item.sessionId],
				sessions: [item],
			});
		}
	}
	return groups;
};

const isRenderEvent = (e: TelemetryEvent): e is RenderEvent => e.type === 'render';
const isScoreEvent = (e: TelemetryEvent): e is ScoreEvent => e.type === 'score';
const isPropChangeEvent = (e: TelemetryEvent): e is PropChangeEvent => e.type === 'prop-change';
const isFrequencyEvent = (e: TelemetryEvent): e is FrequencyEvent => e.type === 'frequency';
const isRecommendationEvent = (e: TelemetryEvent): e is RecommendationEvent => e.type === 'recommendation';
const isSessionEndEvent = (e: TelemetryEvent): e is SessionEndEvent => e.type === 'session-end';

const analyzeComponent = (name: string, group: SessionGroup): ComponentAnalysis => {
	const allEvents = group.sessions.flatMap((s) => [...s.events]);

	const scoreEvents = allEvents.filter(isScoreEvent);
	const renderEvents = allEvents.filter(isRenderEvent);
	const propChangeEvents = allEvents.filter(isPropChangeEvent);
	const frequencyEvents = allEvents.filter(isFrequencyEvent);
	const recommendationEvents = allEvents.filter(isRecommendationEvent);

	// Scores
	const scores = scoreEvents.map((e) => e.score);
	const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
	const minScore = scores.length > 0 ? Math.min(...scores) : null;
	const maxScore = scores.length > 0 ? Math.max(...scores) : null;
	const grade = gradeFromScore(averageScore);
	const scoreTrend = computeTrend(scores);

	// Memo
	const memoClasses = scoreEvents.map((e) => e.memoClassification);
	const memoClassification = majorityMemoClass(memoClasses);

	// Frequency
	const freqClasses = frequencyEvents.map((e) => e.classification);
	const frequencyClass = worstFrequencyClass(freqClasses);

	// Unstable props — collect unique names + types
	const unstableNameSet = new Map<string, PropRefType>();
	for (const e of propChangeEvents) {
		for (const u of e.unstable) {
			if (!unstableNameSet.has(u.name)) {
				unstableNameSet.set(u.name, u.type);
			}
		}
	}
	const unstablePropNames = Object.freeze([...unstableNameSet.keys()]);
	const unstablePropTypes = Object.freeze([...new Set(unstableNameSet.values())]);

	// Unique recommendations
	const recSet = new Set<string>();
	for (const e of recommendationEvents) {
		for (const r of e.recommendations) recSet.add(r);
	}
	const uniqueRecommendations = Object.freeze([...recSet]);

	// Render counts
	const totalRenders = renderEvents.length;
	const noChangeRenderCount = renderEvents.filter((e) => e.triggeredBy === 'parent').length;
	const ineffectiveRenderCount = scoreEvents.filter((e) => e.signalKind === 'reference-only').length;

	// Render velocity — renders per second averaged across sessions
	let totalVelocity = 0;
	let velocitySessions = 0;
	for (let i = 0; i < group.sessions.length; i++) {
		const session = group.sessions[i]!;
		const sessionRenders = session.events.filter(isRenderEvent).length;
		if (sessionRenders === 0) continue;

		const endEvent = session.events.filter(isSessionEndEvent)[0];
		const durationMs =
			endEvent !== undefined
				? endEvent.durationMs
				: (() => {
						const sessionRenderEvents = session.events.filter(isRenderEvent);
						if (sessionRenderEvents.length < 2) return 0;
						const first = sessionRenderEvents[0]!.wallTimestamp;
						const last = sessionRenderEvents[sessionRenderEvents.length - 1]!.wallTimestamp;
						return last - first;
					})();

		if (durationMs > 0) {
			totalVelocity += sessionRenders / (durationMs / 1000);
			velocitySessions++;
		}
	}
	const renderVelocity = velocitySessions > 0 ? totalVelocity / velocitySessions : 0;

	return {
		componentName: name,
		sessionIds: Object.freeze([...group.sessionIds]),
		totalRenders,
		totalSessions: group.sessions.length,
		averageScore,
		minScore,
		maxScore,
		grade,
		memoClassification,
		frequencyClass,
		unstablePropNames,
		unstablePropTypes,
		uniqueRecommendations,
		scoreTrend,
		renderVelocity,
		ineffectiveRenderCount,
		noChangeRenderCount,
	};
};

export const analyzeComponents = (data: readonly ComponentSessionData[]): readonly ComponentAnalysis[] => {
	const groups = groupByComponent(data);
	const results: ComponentAnalysis[] = [];
	for (const [name, group] of groups) {
		results.push(analyzeComponent(name, group));
	}
	return Object.freeze(results);
};
