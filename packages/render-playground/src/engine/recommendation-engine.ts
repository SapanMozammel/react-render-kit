import type { InsightReport } from '@sapanmozammel/render-insights';
import type { Recommendation, RecommendationEvidence, RecommendationSeverity, SessionStats } from '../types/index.js';
import { computeScoreBreakdown } from './score-breakdown.js';
import { computeSessionStats } from './session-stats.js';

type RuleContext = {
	report: InsightReport;
	history: readonly InsightReport[];
	sessionStats: SessionStats;
	breakdown: ReturnType<typeof computeScoreBreakdown>;
};

type RecommendationRule = {
	id: string;
	matches: (ctx: RuleContext) => boolean;
	build: (ctx: RuleContext) => Recommendation;
};

const SEVERITY_WEIGHTS: Record<RecommendationSeverity, number> = {
	CRITICAL: 50,
	HIGH: 40,
	MEDIUM: 30,
	LOW: 20,
	INFO: 10,
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const priorityScore = (r: Recommendation): number => {
	const occurrences = r.evidence.reduce((sum, e) => {
		if (e.type === 'unstable-prop') return sum + e.occurrences;
		if (e.type === 'render-pattern') return sum + e.renderCount;
		return sum;
	}, 0);
	return SEVERITY_WEIGHTS[r.severity] + r.confidence * 10 + Math.min(occurrences, 10);
};

// ── Rules ─────────────────────────────────────────────────────────────────

const rFUNC001: RecommendationRule = {
	id: 'R-FUNC-001',
	matches: ({ report }) => {
		const funcProps = report.props.unstable.filter((p) => p.type === 'function');
		return funcProps.length > 0 && report.memo.sessionClass !== 'NOT_APPLICABLE';
	},
	build: ({ report, history, breakdown }) => {
		const funcProps = report.props.unstable.filter((p) => p.type === 'function');
		const propName = funcProps.length === 1 ? funcProps[0].name : funcProps.map((p) => p.name).join(', ');
		const isIneffective = report.memo.sessionClass === 'INEFFECTIVE';
		const isCritical = isIneffective && funcProps.length >= 2;
		const severity: RecommendationSeverity = isCritical ? 'CRITICAL' : 'HIGH';

		const occurrences = history.filter((r) => r.props.unstable.some((p) => p.type === 'function')).length + 1;
		const confidence = clamp(occurrences / 10, 0, 1);

		const evidence: RecommendationEvidence[] = funcProps.map((p) => ({
			type: 'unstable-prop',
			propName: p.name,
			refType: 'function',
			occurrences,
		}));

		const plural = funcProps.length > 1 ? 's' : '';
		return {
			id: 'R-FUNC-001',
			category: 'unstable-function',
			severity,
			title: `Unstable function prop${plural}: ${propName}`,
			explanation: `${propName} recreates on every parent render (${occurrences}× observed). React.memo receives a new reference and re-renders despite no data change.`,
			fix: `Wrap ${propName} in useCallback at the call site.`,
			expectedImpact: `Eliminates reference-only renders from ${propName}. Memo class improves from ${report.memo.sessionClass} toward EFFECTIVE.`,
			confidence,
			evidence,
		};
	},
};

const rOBJ001: RecommendationRule = {
	id: 'R-OBJ-001',
	matches: ({ report }) => report.props.unstable.some((p) => p.type === 'object'),
	build: ({ report, history }) => {
		const objProps = report.props.unstable.filter((p) => p.type === 'object');
		const propName = objProps.map((p) => p.name).join(', ');
		const isIneffective = report.memo.sessionClass === 'INEFFECTIVE';
		const severity: RecommendationSeverity = isIneffective ? 'HIGH' : 'MEDIUM';

		const occurrences = history.filter((r) => r.props.unstable.some((p) => p.type === 'object')).length + 1;
		const confidence = clamp(occurrences / 10, 0, 1);

		const evidence: RecommendationEvidence[] = objProps.map((p) => ({
			type: 'unstable-prop',
			propName: p.name,
			refType: 'object',
			occurrences,
		}));

		return {
			id: 'R-OBJ-001',
			category: 'unstable-object',
			severity,
			title: `Unstable object prop: ${propName}`,
			explanation: `${propName} is a new object on every render. Even if properties haven't changed, React sees a new reference.`,
			fix: `Wrap ${propName} computation in useMemo at the call site.`,
			expectedImpact: `Eliminates reference-instability renders caused by ${propName}.`,
			confidence,
			evidence,
		};
	},
};

const rARR001: RecommendationRule = {
	id: 'R-ARR-001',
	matches: ({ report }) => report.props.unstable.some((p) => p.type === 'array'),
	build: ({ report, history }) => {
		const arrProps = report.props.unstable.filter((p) => p.type === 'array');
		const propName = arrProps.map((p) => p.name).join(', ');
		const isIneffective = report.memo.sessionClass === 'INEFFECTIVE';
		const severity: RecommendationSeverity = isIneffective ? 'HIGH' : 'MEDIUM';

		const occurrences = history.filter((r) => r.props.unstable.some((p) => p.type === 'array')).length + 1;
		const confidence = clamp(occurrences / 10, 0, 1);

		const evidence: RecommendationEvidence[] = arrProps.map((p) => ({
			type: 'unstable-prop',
			propName: p.name,
			refType: 'array',
			occurrences,
		}));

		return {
			id: 'R-ARR-001',
			category: 'unstable-array',
			severity,
			title: `Unstable array prop: ${propName}`,
			explanation: `${propName} is a new array on every render.`,
			fix: `Wrap ${propName} in useMemo at the call site.`,
			expectedImpact: `Eliminates reference-instability renders caused by ${propName}.`,
			confidence,
			evidence,
		};
	},
};

const rMEMO001: RecommendationRule = {
	id: 'R-MEMO-001',
	matches: ({ report }) => report.memo.sessionClass === 'INEFFECTIVE' && report.memo.referenceOnlyCount >= 3,
	build: ({ report, breakdown }) => {
		const { referenceOnlyCount } = report.memo;
		const confidence = clamp(referenceOnlyCount / 10, 0, 1);
		const recoverable = breakdown.instabilityPenalty + breakdown.memoPenalty;

		return {
			id: 'R-MEMO-001',
			category: 'ineffective-memo',
			severity: 'CRITICAL',
			title: 'React.memo fully defeated',
			explanation: `All ${referenceOnlyCount} observed renders are caused by reference-unstable props. The memo optimization provides zero benefit.`,
			fix: 'Stabilize all props in Unstable Props — useCallback for functions, useMemo for objects and arrays.',
			expectedImpact: `Memo class becomes EFFECTIVE. Score recovers up to ${recoverable} pts.`,
			confidence,
			evidence: [
				{
					type: 'memo-session',
					sessionClass: report.memo.sessionClass,
					genuineCount: report.memo.genuineCount,
					referenceOnlyCount,
					mixedCount: report.memo.mixedCount,
				},
			],
		};
	},
};

const rMEMO002: RecommendationRule = {
	id: 'R-MEMO-002',
	matches: ({ report }) => report.memo.sessionClass === 'PARTIALLY_EFFECTIVE' && report.memo.mixedCount >= 2,
	build: ({ report }) => {
		const { mixedCount } = report.memo;
		const confidence = clamp(mixedCount / 5, 0, 1);

		return {
			id: 'R-MEMO-002',
			category: 'partially-effective-memo',
			severity: 'MEDIUM',
			title: 'Memo partially defeated',
			explanation: `${mixedCount} renders have mixed signals — genuine prop changes alongside reference-unstable props.`,
			fix: 'Stabilize the remaining unstable props to convert mixed signals to genuine-only.',
			expectedImpact: 'Memo class improves from PARTIALLY_EFFECTIVE to EFFECTIVE.',
			confidence,
			evidence: [
				{
					type: 'memo-session',
					sessionClass: report.memo.sessionClass,
					genuineCount: report.memo.genuineCount,
					referenceOnlyCount: report.memo.referenceOnlyCount,
					mixedCount,
				},
			],
		};
	},
};

const rFREQ001: RecommendationRule = {
	id: 'R-FREQ-001',
	matches: ({ report }) => report.frequency.classification === 'HIGH',
	build: ({ report, breakdown }) => {
		const { rate, windowMs, classification } = report.frequency;
		const { frequencyPenalty } = breakdown;
		const moderateRecovery = frequencyPenalty - 10;

		return {
			id: 'R-FREQ-001',
			category: 'excessive-frequency',
			severity: 'HIGH',
			title: `High render frequency: ${rate.toFixed(1)}/s`,
			explanation: `${rate.toFixed(1)} renders/second over a ${windowMs / 1000}s window — ${frequencyPenalty} pt frequency penalty.`,
			fix: 'Investigate parent state updates or context subscription breadth driving this component.',
			expectedImpact: `Dropping to MODERATE frequency recovers ${moderateRecovery} pts; dropping to LOW recovers all ${frequencyPenalty} pts.`,
			confidence: 1,
			evidence: [
				{
					type: 'frequency-measurement',
					ratePerSecond: rate,
					classification,
					windowMs,
				},
			],
		};
	},
};

const rPARENT001: RecommendationRule = {
	id: 'R-PARENT-001',
	matches: ({ report, history }) => {
		const recent = [...history.slice(-4), report];
		return recent.length >= 5 && recent.every((r) => r.inferredTrigger === 'no-prop-change');
	},
	build: ({ report, history }) => {
		const recent = [...history.slice(-4), report];
		const count = recent.length;
		const confidence = clamp(count / 10, 0, 1);

		return {
			id: 'R-PARENT-001',
			category: 'parent-triggered',
			severity: 'MEDIUM',
			title: 'Renders without prop changes',
			explanation: `The last ${count} renders had no prop changes. This component re-renders because its parent does, not because its own data changed.`,
			fix: 'Wrap in React.memo, or move state/context subscriptions closer to where they are consumed.',
			expectedImpact: 'Eliminates no-prop-change renders. Frequency class may improve.',
			confidence,
			evidence: [
				{
					type: 'render-pattern',
					pattern: 'all-no-change',
					renderCount: count,
				},
			],
		};
	},
};

const rMEMO003: RecommendationRule = {
	id: 'R-MEMO-003',
	matches: ({ report }) =>
		report.memo.sessionClass === 'EFFECTIVE' &&
		report.score >= 90 &&
		report.props.unstable.length === 0 &&
		report.memo.genuineCount >= 5,
	build: ({ report }) => ({
		id: 'R-MEMO-003',
		category: 'over-memoization',
		severity: 'INFO',
		title: 'React.memo overhead may be unnecessary',
		explanation: `All ${report.memo.genuineCount} observed renders are driven by genuine prop changes. Memo is working correctly but adds overhead if this component renders cheaply.`,
		fix: 'Profile render cost. If under 0.1ms, removing React.memo reduces reconciler overhead.',
		expectedImpact: 'Minor overhead reduction; health score unaffected.',
		confidence: 1,
		evidence: [
			{
				type: 'memo-session',
				sessionClass: report.memo.sessionClass,
				genuineCount: report.memo.genuineCount,
				referenceOnlyCount: report.memo.referenceOnlyCount,
				mixedCount: report.memo.mixedCount,
			},
		],
	}),
};

const rSCORE001: RecommendationRule = {
	id: 'R-SCORE-001',
	matches: ({ report, sessionStats }) =>
		sessionStats.scoreTrend === 'degrading' && sessionStats.averageScore - report.score >= 20,
	build: ({ report, sessionStats }) => {
		const delta = sessionStats.averageScore - report.score;
		const confidence = clamp(delta / 30, 0, 1);

		return {
			id: 'R-SCORE-001',
			category: 'score-degrading',
			severity: 'HIGH',
			title: 'Render health declining',
			explanation: `Score has dropped ${delta} pts below the session average of ${sessionStats.averageScore}. Recent renders are less healthy than earlier ones.`,
			fix: 'Check what changed in recent interactions — new unstable props or increased frequency are common causes.',
			expectedImpact: `Restoring earlier patterns should bring score back toward ${sessionStats.averageScore}.`,
			confidence,
			evidence: [
				{
					type: 'score-component',
					label: 'Score delta',
					penalty: delta,
				},
			],
		};
	},
};

const rCLEAR001: RecommendationRule = {
	id: 'R-CLEAR-001',
	matches: ({ report }) =>
		report.score >= 90 && report.props.unstable.length === 0 && report.frequency.classification !== 'HIGH',
	build: ({ sessionStats }) => ({
		id: 'R-CLEAR-001',
		category: 'well-optimized',
		severity: 'INFO',
		title: 'Component is well-optimized',
		explanation: `No unstable props, frequency issues, or memo problems detected across ${sessionStats.windowSize} renders.`,
		fix: 'No action required.',
		expectedImpact: 'Continue monitoring as the component evolves.',
		confidence: 1,
		evidence: [],
	}),
};

const ALL_RULES: RecommendationRule[] = [
	rFUNC001,
	rOBJ001,
	rARR001,
	rMEMO001,
	rMEMO002,
	rFREQ001,
	rPARENT001,
	rMEMO003,
	rSCORE001,
	rCLEAR001,
];

export const computeRecommendations = (
	report: InsightReport,
	history: readonly InsightReport[],
): Recommendation[] => {
	const sessionStats = computeSessionStats(history);
	const breakdown = computeScoreBreakdown(report);
	const ctx: RuleContext = { report, history, sessionStats, breakdown };

	const matched: Recommendation[] = [];
	let clearFired = false;

	for (const rule of ALL_RULES) {
		if (rule.id === 'R-CLEAR-001') continue; // evaluated separately
		if (rule.matches(ctx)) {
			matched.push(rule.build(ctx));
		}
	}

	// R-CLEAR-001 fires only when no other rules produced results
	if (matched.length === 0 && rCLEAR001.matches(ctx)) {
		clearFired = true;
		matched.push(rCLEAR001.build(ctx));
	}

	// Sort by priority descending
	matched.sort((a, b) => priorityScore(b) - priorityScore(a));

	// INFO-only cap: if everything is INFO, show only 1
	const hasNonInfo = matched.some((r) => r.severity !== 'INFO');
	if (!hasNonInfo && !clearFired && matched.length > 1) {
		return matched.slice(0, 1);
	}

	return matched.slice(0, 5);
};
