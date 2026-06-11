import type {
	ComponentAnalysis,
	Bottleneck,
	RootCause,
	CorrelationGroup,
	ApplicationHealth,
	IntelligenceRecommendation,
	IntelligenceRecommendationCategory,
	RecommendationSeverity,
	IntelligenceRecommendationEvidence,
	IntelligenceOptions,
} from '../types/index.js';

const SEVERITY_WEIGHTS: Record<RecommendationSeverity, number> = {
	CRITICAL: 50,
	HIGH: 40,
	MEDIUM: 30,
	LOW: 20,
	INFO: 10,
};

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

const priorityScore = (r: IntelligenceRecommendation, bottlenecks: readonly Bottleneck[]): number => {
	const bottleneck = r.componentName !== null ? bottlenecks.find((b) => b.componentName === r.componentName) : null;
	const impact = bottleneck?.impactScore ?? 0;
	return SEVERITY_WEIGHTS[r.severity] * 10 + r.confidence * 10 + impact;
};

type RuleContext = {
	components: readonly ComponentAnalysis[];
	bottlenecks: readonly Bottleneck[];
	rootCauses: readonly RootCause[];
	correlations: readonly CorrelationGroup[];
	health: ApplicationHealth;
	includeWellOptimized: boolean;
};

type RecommendationRule = {
	id: string;
	category: IntelligenceRecommendationCategory;
	evaluate: (ctx: RuleContext) => IntelligenceRecommendation[];
};

// ── Per-component rules ────────────────────────────────────────────────────

const rFUNC001: RecommendationRule = {
	id: 'R-INTEL-FUNC-001',
	category: 'unstable-function',
	evaluate: ({ components, bottlenecks }) =>
		components
			.filter((c) => {
				const funcTypes = c.unstablePropTypes.filter((t) => t === 'function');
				const ineffectiveRatio = c.totalRenders > 0 ? c.ineffectiveRenderCount / c.totalRenders : 0;
				return funcTypes.length > 0 && ineffectiveRatio > 0.3;
			})
			.map((c) => {
				const funcProps = c.unstablePropNames.filter((_, i) => c.unstablePropTypes[i] === 'function');
				const occurrenceRate = c.totalRenders > 0 ? c.ineffectiveRenderCount / c.totalRenders : 0;
				const bottleneck = bottlenecks.find((b) => b.componentName === c.componentName);
				const confidence = clamp(0.5 + occurrenceRate * 0.5, 0, 1);
				const propList = funcProps.length > 0 ? funcProps.join(', ') : (c.unstablePropNames[0] ?? 'unknown');
				const evidence: IntelligenceRecommendationEvidence[] = [
					{ type: 'component-analysis', componentName: c.componentName, avgScore: c.averageScore, grade: c.grade },
					{ type: 'unstable-prop', propName: propList, refType: 'function', occurrenceRate },
				];
				if (bottleneck) evidence.push({ type: 'bottleneck', rank: bottleneck.rank, impactScore: bottleneck.impactScore });
				return {
					id: 'R-INTEL-FUNC-001',
					componentName: c.componentName,
					category: 'unstable-function' as IntelligenceRecommendationCategory,
					severity: c.memoClassification === 'INEFFECTIVE' ? ('CRITICAL' as RecommendationSeverity) : ('HIGH' as RecommendationSeverity),
					title: `Unstable function props in ${c.componentName}`,
					explanation: `Function prop(s) [${propList}] create new references on every render — defeating React.memo in ${Math.round(occurrenceRate * 100)}% of observed renders.`,
					fix: `Wrap [${propList}] with useCallback at the call site.`,
					expectedImpact: `Eliminates reference-only renders. Memo class should improve from ${c.memoClassification ?? 'current'} toward EFFECTIVE.`,
					confidence,
					affectedComponents: [c.componentName],
					evidence: Object.freeze(evidence),
				};
			}),
};

const rOBJ001: RecommendationRule = {
	id: 'R-INTEL-OBJ-001',
	category: 'unstable-object',
	evaluate: ({ components, bottlenecks }) =>
		components
			.filter((c) => {
				const ineffectiveRatio = c.totalRenders > 0 ? c.ineffectiveRenderCount / c.totalRenders : 0;
				return c.unstablePropTypes.includes('object') && ineffectiveRatio > 0.3;
			})
			.map((c) => {
				const objProps = c.unstablePropNames.filter((_, i) => c.unstablePropTypes[i] === 'object');
				const occurrenceRate = c.totalRenders > 0 ? c.ineffectiveRenderCount / c.totalRenders : 0;
				const propList = objProps.length > 0 ? objProps.join(', ') : (c.unstablePropNames[0] ?? 'unknown');
				const confidence = clamp(0.4 + occurrenceRate * 0.5, 0, 1);
				const bottleneck = bottlenecks.find((b) => b.componentName === c.componentName);
				const evidence: IntelligenceRecommendationEvidence[] = [
					{ type: 'component-analysis', componentName: c.componentName, avgScore: c.averageScore, grade: c.grade },
					{ type: 'unstable-prop', propName: propList, refType: 'object', occurrenceRate },
				];
				if (bottleneck) evidence.push({ type: 'bottleneck', rank: bottleneck.rank, impactScore: bottleneck.impactScore });
				return {
					id: 'R-INTEL-OBJ-001',
					componentName: c.componentName,
					category: 'unstable-object' as IntelligenceRecommendationCategory,
					severity: 'MEDIUM' as RecommendationSeverity,
					title: `Unstable object props in ${c.componentName}`,
					explanation: `Object prop(s) [${propList}] are new references on every render despite potentially unchanged data.`,
					fix: `Wrap [${propList}] computation with useMemo at the call site.`,
					expectedImpact: 'Eliminates reference-instability renders caused by these props.',
					confidence,
					affectedComponents: [c.componentName],
					evidence: Object.freeze(evidence),
				};
			}),
};

const rARR001: RecommendationRule = {
	id: 'R-INTEL-ARR-001',
	category: 'unstable-array',
	evaluate: ({ components, bottlenecks }) =>
		components
			.filter((c) => {
				const ineffectiveRatio = c.totalRenders > 0 ? c.ineffectiveRenderCount / c.totalRenders : 0;
				return c.unstablePropTypes.includes('array') && ineffectiveRatio > 0.3;
			})
			.map((c) => {
				const arrProps = c.unstablePropNames.filter((_, i) => c.unstablePropTypes[i] === 'array');
				const occurrenceRate = c.totalRenders > 0 ? c.ineffectiveRenderCount / c.totalRenders : 0;
				const propList = arrProps.length > 0 ? arrProps.join(', ') : (c.unstablePropNames[0] ?? 'unknown');
				const confidence = clamp(0.4 + occurrenceRate * 0.5, 0, 1);
				const bottleneck = bottlenecks.find((b) => b.componentName === c.componentName);
				const evidence: IntelligenceRecommendationEvidence[] = [
					{ type: 'component-analysis', componentName: c.componentName, avgScore: c.averageScore, grade: c.grade },
					{ type: 'unstable-prop', propName: propList, refType: 'array', occurrenceRate },
				];
				if (bottleneck) evidence.push({ type: 'bottleneck', rank: bottleneck.rank, impactScore: bottleneck.impactScore });
				return {
					id: 'R-INTEL-ARR-001',
					componentName: c.componentName,
					category: 'unstable-array' as IntelligenceRecommendationCategory,
					severity: 'MEDIUM' as RecommendationSeverity,
					title: `Unstable array props in ${c.componentName}`,
					explanation: `Array prop(s) [${propList}] are new array instances on every render.`,
					fix: `Wrap [${propList}] with useMemo at the call site.`,
					expectedImpact: 'Eliminates reference-instability renders caused by these props.',
					confidence,
					affectedComponents: [c.componentName],
					evidence: Object.freeze(evidence),
				};
			}),
};

const rMEMO001: RecommendationRule = {
	id: 'R-INTEL-MEMO-001',
	category: 'ineffective-memo',
	evaluate: ({ components, bottlenecks }) =>
		components
			.filter((c) => c.averageScore < 50 && c.memoClassification === 'INEFFECTIVE')
			.map((c) => {
				const ineffectiveRatio = c.totalRenders > 0 ? c.ineffectiveRenderCount / c.totalRenders : 0;
				const confidence = clamp(0.7 + ineffectiveRatio * 0.3, 0, 1);
				const bottleneck = bottlenecks.find((b) => b.componentName === c.componentName);
				const evidence: IntelligenceRecommendationEvidence[] = [{ type: 'component-analysis', componentName: c.componentName, avgScore: c.averageScore, grade: c.grade }];
				if (bottleneck) evidence.push({ type: 'bottleneck', rank: bottleneck.rank, impactScore: bottleneck.impactScore });
				return {
					id: 'R-INTEL-MEMO-001',
					componentName: c.componentName,
					category: 'ineffective-memo' as IntelligenceRecommendationCategory,
					severity: 'CRITICAL' as RecommendationSeverity,
					title: `React.memo fully defeated in ${c.componentName}`,
					explanation: `${c.componentName} has INEFFECTIVE memo classification with an average score of ${c.averageScore}. All observed re-renders are reference-driven — memo provides zero benefit.`,
					fix: 'Stabilize all props listed in unstable-prop recommendations. Use useCallback for functions, useMemo for objects and arrays.',
					expectedImpact: `Memo class improves to EFFECTIVE. Score recovery of ${100 - c.averageScore} pts possible.`,
					confidence,
					affectedComponents: [c.componentName],
					evidence: Object.freeze(evidence),
				};
			}),
};

const rMEMO002: RecommendationRule = {
	id: 'R-INTEL-MEMO-002',
	category: 'partially-effective-memo',
	evaluate: ({ components }) =>
		components
			.filter((c) => c.memoClassification === 'PARTIALLY_EFFECTIVE')
			.map((c) => {
				const confidence = 0.6;
				return {
					id: 'R-INTEL-MEMO-002',
					componentName: c.componentName,
					category: 'partially-effective-memo' as IntelligenceRecommendationCategory,
					severity: 'MEDIUM' as RecommendationSeverity,
					title: `Memo partially defeated in ${c.componentName}`,
					explanation: `${c.componentName} has mixed render signals — some genuine prop changes, some reference-only. Memo is partially working.`,
					fix: 'Stabilize the remaining unstable props to convert mixed signals to genuine-only.',
					expectedImpact: 'Memo class improves from PARTIALLY_EFFECTIVE to EFFECTIVE.',
					confidence,
					affectedComponents: [c.componentName],
					evidence: Object.freeze([{ type: 'component-analysis', componentName: c.componentName, avgScore: c.averageScore, grade: c.grade }] as IntelligenceRecommendationEvidence[]),
				};
			}),
};

const rFREQ001: RecommendationRule = {
	id: 'R-INTEL-FREQ-001',
	category: 'excessive-frequency',
	evaluate: ({ components, bottlenecks }) =>
		components
			.filter((c) => c.frequencyClass === 'HIGH')
			.map((c) => {
				const bottleneck = bottlenecks.find((b) => b.componentName === c.componentName);
				const evidence: IntelligenceRecommendationEvidence[] = [{ type: 'component-analysis', componentName: c.componentName, avgScore: c.averageScore, grade: c.grade }];
				if (bottleneck) evidence.push({ type: 'bottleneck', rank: bottleneck.rank, impactScore: bottleneck.impactScore });
				return {
					id: 'R-INTEL-FREQ-001',
					componentName: c.componentName,
					category: 'excessive-frequency' as IntelligenceRecommendationCategory,
					severity: 'HIGH' as RecommendationSeverity,
					title: `High render frequency in ${c.componentName}`,
					explanation: `${c.componentName} is rendering at HIGH frequency (${c.renderVelocity.toFixed(1)} renders/s). This contributes a 25 pt frequency penalty to the health score.`,
					fix: 'Investigate parent state updates or context subscription breadth. Consider debouncing or batching state updates.',
					expectedImpact: 'Dropping to LOW frequency recovers 25 pts; MODERATE recovers 15 pts.',
					confidence: 1,
					affectedComponents: [c.componentName],
					evidence: Object.freeze(evidence),
				};
			}),
};

const rPARENT001: RecommendationRule = {
	id: 'R-INTEL-PARENT-001',
	category: 'parent-cascade',
	evaluate: ({ components }) =>
		components
			.filter((c) => c.totalRenders > 0 && c.noChangeRenderCount / c.totalRenders > 0.6)
			.map((c) => {
				const ratio = c.noChangeRenderCount / c.totalRenders;
				const confidence = clamp(ratio, 0, 1);
				return {
					id: 'R-INTEL-PARENT-001',
					componentName: c.componentName,
					category: 'parent-cascade' as IntelligenceRecommendationCategory,
					severity: 'MEDIUM' as RecommendationSeverity,
					title: `${Math.round(ratio * 100)}% of ${c.componentName} renders have no prop changes`,
					explanation: `${c.componentName} re-renders because its parent does, not because its own data changed. ${c.noChangeRenderCount} of ${c.totalRenders} renders are parent-triggered.`,
					fix: 'Wrap this component in React.memo, or move state/context subscriptions closer to where they are consumed.',
					expectedImpact: 'Eliminates unnecessary parent-triggered renders. Frequency class may improve.',
					confidence,
					affectedComponents: [c.componentName],
					evidence: Object.freeze([{ type: 'component-analysis', componentName: c.componentName, avgScore: c.averageScore, grade: c.grade }] as IntelligenceRecommendationEvidence[]),
				};
			}),
};

const rTREND001: RecommendationRule = {
	id: 'R-INTEL-TREND-001',
	category: 'score-degradation',
	evaluate: ({ components }) =>
		components
			.filter((c) => c.scoreTrend === 'degrading' && c.maxScore !== null && c.maxScore - c.averageScore > 20)
			.map((c) => {
				const delta = (c.maxScore ?? 0) - c.averageScore;
				const confidence = clamp(delta / 50, 0, 1);
				return {
					id: 'R-INTEL-TREND-001',
					componentName: c.componentName,
					category: 'score-degradation' as IntelligenceRecommendationCategory,
					severity: 'HIGH' as RecommendationSeverity,
					title: `Declining render health in ${c.componentName}`,
					explanation: `Health score is trending downward — average score is ${c.averageScore} vs peak of ${c.maxScore}. Something changed mid-session that degraded render performance.`,
					fix: 'Review what interactions or state changes occur mid-session. New unstable props or increased frequency are common causes.',
					expectedImpact: `Restoring earlier render patterns should bring score back toward ${c.maxScore}.`,
					confidence,
					affectedComponents: [c.componentName],
					evidence: Object.freeze([{ type: 'component-analysis', componentName: c.componentName, avgScore: c.averageScore, grade: c.grade }] as IntelligenceRecommendationEvidence[]),
				};
			}),
};

// ── Cross-component rules ──────────────────────────────────────────────────

const rSYNC001: RecommendationRule = {
	id: 'R-INTEL-SYNC-001',
	category: 'synchronized-renders',
	evaluate: ({ correlations }) =>
		correlations
			.filter((g) => g.type === 'synchronized-renders' && g.confidence >= 0.7)
			.map((g) => ({
				id: 'R-INTEL-SYNC-001',
				componentName: null,
				category: 'synchronized-renders' as IntelligenceRecommendationCategory,
				severity: 'MEDIUM' as RecommendationSeverity,
				title: `Synchronized renders: ${g.components.join(' ↔ ')}`,
				explanation: g.description,
				fix: 'Identify the shared parent or context provider driving both components. Consider splitting context or moving state down.',
				expectedImpact: 'Reducing synchronized renders can halve unnecessary re-renders in this component pair.',
				confidence: g.confidence,
				affectedComponents: [...g.components],
				evidence: Object.freeze([{ type: 'correlation', components: g.components, confidence: g.confidence }] as IntelligenceRecommendationEvidence[]),
			})),
};

const rCASC001: RecommendationRule = {
	id: 'R-INTEL-CASC-001',
	category: 'render-cascade',
	evaluate: ({ correlations }) =>
		correlations
			.filter((g) => g.type === 'probable-cascade' && g.confidence >= 0.6)
			.map((g) => ({
				id: 'R-INTEL-CASC-001',
				componentName: g.components[0] ?? null,
				category: 'render-cascade' as IntelligenceRecommendationCategory,
				severity: 'HIGH' as RecommendationSeverity,
				title: `Render cascade: ${g.components.join(' → ')}`,
				explanation: g.description,
				fix: `Memoize ${g.components[1] ?? 'the child component'} so it doesn't re-render unless its own props change. Verify that ${g.components[0] ?? 'the parent'} isn't passing unstable references.`,
				expectedImpact: `Breaks the cascade — ${g.components[1] ?? 'child'} only re-renders when its own props change.`,
				confidence: g.confidence,
				affectedComponents: [...g.components],
				evidence: Object.freeze([{ type: 'correlation', components: g.components, confidence: g.confidence }] as IntelligenceRecommendationEvidence[]),
			})),
};

// ── Application-level rules ────────────────────────────────────────────────

const rAPP001: RecommendationRule = {
	id: 'R-INTEL-APP-001',
	category: 'application-health-critical',
	evaluate: ({ health }) => {
		const degradedRatio = (health.criticalCount + health.degradedCount) / Math.max(health.componentCount, 1);
		if (degradedRatio <= 0.3) return [];
		return [
			{
				id: 'R-INTEL-APP-001',
				componentName: null,
				category: 'application-health-critical' as IntelligenceRecommendationCategory,
				severity: 'CRITICAL' as RecommendationSeverity,
				title: `Application render health is ${health.grade} — ${Math.round(degradedRatio * 100)}% of components degraded`,
				explanation: `${health.criticalCount + health.degradedCount} of ${health.componentCount} components have degraded render health. Application score: ${health.score}.`,
				fix: 'Address the top-ranked bottlenecks first. Focus on components with INEFFECTIVE memo and high render frequency.',
				expectedImpact: 'Fixing top 3 bottlenecks typically recovers 20–40% of application health score.',
				confidence: 1,
				affectedComponents: [],
				evidence: Object.freeze([{ type: 'app-health', score: health.score, criticalCount: health.criticalCount, degradedCount: health.degradedCount }] as IntelligenceRecommendationEvidence[]),
			},
		];
	},
};

const rAPP002: RecommendationRule = {
	id: 'R-INTEL-APP-002',
	category: 'dominant-bottleneck',
	evaluate: ({ bottlenecks }) => {
		const top = bottlenecks[0];
		if (top === undefined || top.impactScore <= 60) return [];
		return [
			{
				id: 'R-INTEL-APP-002',
				componentName: top.componentName,
				category: 'dominant-bottleneck' as IntelligenceRecommendationCategory,
				severity: 'HIGH' as RecommendationSeverity,
				title: `${top.componentName} is the dominant bottleneck (impact: ${top.impactScore})`,
				explanation: `${top.componentName} accounts for the majority of render degradation across the application. Fixing it first will have the highest ROI.`,
				fix: `Address ${top.category} issues in ${top.componentName} as the top priority.`,
				expectedImpact: `Highest-impact single fix available — expect significant application score improvement.`,
				confidence: 0.9,
				affectedComponents: [top.componentName],
				evidence: Object.freeze([{ type: 'bottleneck', rank: top.rank, impactScore: top.impactScore }] as IntelligenceRecommendationEvidence[]),
			},
		];
	},
};

const rCOV001: RecommendationRule = {
	id: 'R-INTEL-COV-001',
	category: 'low-coverage',
	evaluate: ({ health }) => {
		if (health.componentCount >= 2) return [];
		return [
			{
				id: 'R-INTEL-COV-001',
				componentName: null,
				category: 'low-coverage' as IntelligenceRecommendationCategory,
				severity: 'INFO' as RecommendationSeverity,
				title: 'Low analysis coverage — only 1 component instrumented',
				explanation: 'render-intelligence works best with multiple components instrumented. Cross-component correlations and bottleneck rankings require at least 2 components.',
				fix: 'Instrument additional components with render-telemetry-core to get full application-level analysis.',
				expectedImpact: 'Enables cross-component correlation detection and comparative bottleneck rankings.',
				confidence: 1,
				affectedComponents: [],
				evidence: Object.freeze([{ type: 'app-health', score: health.score, criticalCount: health.criticalCount, degradedCount: health.degradedCount }] as IntelligenceRecommendationEvidence[]),
			},
		];
	},
};

// ── Well-optimized rules (fire only when no other rules produced results) ──

const rWELL001: RecommendationRule = {
	id: 'R-INTEL-WELL-001',
	category: 'well-optimized',
	evaluate: ({ health }) => {
		if (health.score < 90) return [];
		return [
			{
				id: 'R-INTEL-WELL-001',
				componentName: null,
				category: 'well-optimized' as IntelligenceRecommendationCategory,
				severity: 'INFO' as RecommendationSeverity,
				title: 'Application is well-optimized — all components healthy',
				explanation: `Application score is ${health.score} (${health.grade}). All ${health.componentCount} component(s) meet the health threshold.`,
				fix: 'No action required. Continue monitoring as the application evolves.',
				expectedImpact: 'Maintain current render health.',
				confidence: 1,
				affectedComponents: [],
				evidence: Object.freeze([{ type: 'app-health', score: health.score, criticalCount: health.criticalCount, degradedCount: health.degradedCount }] as IntelligenceRecommendationEvidence[]),
			},
		];
	},
};

const rWELL002: RecommendationRule = {
	id: 'R-INTEL-WELL-002',
	category: 'well-optimized',
	evaluate: ({ health }) => {
		if (health.score < 70 || health.criticalCount > 0) return [];
		return [
			{
				id: 'R-INTEL-WELL-002',
				componentName: null,
				category: 'well-optimized' as IntelligenceRecommendationCategory,
				severity: 'INFO' as RecommendationSeverity,
				title: `Strong application health — score ${health.score} (${health.grade})`,
				explanation: `${health.healthyCount} of ${health.componentCount} component(s) are healthy. No critical issues detected.`,
				fix: 'Address any degraded components identified above to reach EXCELLENT status.',
				expectedImpact: `Fixing ${health.degradedCount} degraded component(s) would bring application score above 90.`,
				confidence: 1,
				affectedComponents: [],
				evidence: Object.freeze([{ type: 'app-health', score: health.score, criticalCount: health.criticalCount, degradedCount: health.degradedCount }] as IntelligenceRecommendationEvidence[]),
			},
		];
	},
};

const ACTIONABLE_RULES: RecommendationRule[] = [rFUNC001, rOBJ001, rARR001, rMEMO001, rMEMO002, rFREQ001, rPARENT001, rTREND001, rSYNC001, rCASC001, rAPP001, rAPP002, rCOV001];
const WELL_OPTIMIZED_RULES: RecommendationRule[] = [rWELL001, rWELL002];

export const generateRecommendations = (
	components: readonly ComponentAnalysis[],
	bottlenecks: readonly Bottleneck[],
	rootCauses: readonly RootCause[],
	correlations: readonly CorrelationGroup[],
	health: ApplicationHealth,
	options: Pick<IntelligenceOptions, 'maxRecommendations' | 'includeWellOptimized'>
): readonly IntelligenceRecommendation[] => {
	const maxRecommendations = options.maxRecommendations ?? 20;
	const includeWellOptimized = options.includeWellOptimized ?? false;
	const ctx: RuleContext = { components, bottlenecks, rootCauses, correlations, health, includeWellOptimized };

	const seen = new Set<string>();
	const actionable: IntelligenceRecommendation[] = [];

	for (const rule of ACTIONABLE_RULES) {
		for (const rec of rule.evaluate(ctx)) {
			const key = `${rec.id}::${rec.componentName ?? 'app'}`;
			if (seen.has(key)) continue;
			seen.add(key);
			actionable.push(rec);
		}
	}

	if (actionable.length === 0 || includeWellOptimized) {
		for (const rule of WELL_OPTIMIZED_RULES) {
			for (const rec of rule.evaluate(ctx)) {
				const key = `${rec.id}::${rec.componentName ?? 'app'}`;
				if (seen.has(key)) continue;
				seen.add(key);
				actionable.push(rec);
				break;
			}
			if (!includeWellOptimized && actionable.length > 0) break;
		}
	}

	actionable.sort((a, b) => priorityScore(b, bottlenecks) - priorityScore(a, bottlenecks));

	// Cap INFO recommendations at 2 when mixed with higher-severity ones
	const hasNonInfo = actionable.some((r) => r.severity !== 'INFO');
	if (hasNonInfo) {
		let infoCount = 0;
		const filtered = actionable.filter((r) => {
			if (r.severity !== 'INFO') return true;
			infoCount++;
			return infoCount <= 2;
		});
		return Object.freeze(filtered.slice(0, maxRecommendations));
	}

	return Object.freeze(actionable.slice(0, maxRecommendations));
};
