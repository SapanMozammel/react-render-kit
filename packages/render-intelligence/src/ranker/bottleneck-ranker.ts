import type { ComponentAnalysis, CorrelationGroup, Bottleneck, BottleneckCategory, BottleneckEvidence } from '../types/index.js';

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

const computeImpactScore = (c: ComponentAnalysis, renderRatio: number): number => {
	const scoreDeficit = 100 - c.averageScore;
	const instabilityBonus = Math.min(25, c.unstablePropNames.length * 5);
	const frequencyBonus = c.frequencyClass === 'HIGH' ? 15 : 0;
	const memoBonus = c.memoClassification === 'INEFFECTIVE' ? 10 : 0;
	return clamp(scoreDeficit * renderRatio + instabilityBonus + frequencyBonus + memoBonus, 0, 100);
};

const dominantCategory = (c: ComponentAnalysis): BottleneckCategory => {
	if (c.memoClassification === 'INEFFECTIVE' && c.unstablePropNames.length > 0) return 'ineffective-memo';
	if (c.unstablePropNames.length > 0) return 'reference-instability';
	if (c.frequencyClass === 'HIGH') return 'high-frequency';
	if (c.scoreTrend === 'degrading') return 'score-degradation';
	const noChangeRatio = c.totalRenders > 0 ? c.noChangeRenderCount / c.totalRenders : 0;
	if (noChangeRatio > 0.6) return 'parent-cascade';
	return 'no-change-renders';
};

const buildEvidence = (c: ComponentAnalysis, category: BottleneckCategory): readonly BottleneckEvidence[] => {
	const evidence: BottleneckEvidence[] = [];

	if (category === 'reference-instability' || category === 'ineffective-memo') {
		for (let i = 0; i < c.unstablePropNames.length && i < 3; i++) {
			const name = c.unstablePropNames[i]!;
			const refType = c.unstablePropTypes[0] ?? 'object';
			const occurrenceRate = c.totalRenders > 0 ? c.ineffectiveRenderCount / c.totalRenders : 0;
			evidence.push({ type: 'unstable-prop', propName: name, refType, occurrenceRate });
		}
	}

	if (category === 'ineffective-memo' && c.memoClassification !== null) {
		const ineffectiveRatio = c.totalRenders > 0 ? c.ineffectiveRenderCount / c.totalRenders : 0;
		evidence.push({ type: 'memo-defeat', sessionClass: c.memoClassification, ineffectiveRatio });
	}

	if (category === 'high-frequency' && c.frequencyClass !== null) {
		evidence.push({ type: 'frequency', frequencyClass: c.frequencyClass, renderVelocity: c.renderVelocity });
	}

	if (category === 'parent-cascade' || category === 'no-change-renders') {
		const renderCount = c.noChangeRenderCount;
		const ratio = c.totalRenders > 0 ? renderCount / c.totalRenders : 0;
		evidence.push({ type: 'render-pattern', pattern: 'no-change', renderCount, ratio });
	}

	if (category === 'score-degradation') {
		const avgPenalty = 100 - c.averageScore;
		evidence.push({ type: 'score-component', label: 'Score deficit', avgPenalty });
	}

	return Object.freeze(evidence);
};

const buildDescription = (c: ComponentAnalysis, category: BottleneckCategory, impactScore: number): string => {
	switch (category) {
		case 'ineffective-memo':
			return `React.memo is fully defeated — all reference-unstable props cause unnecessary re-renders (impact: ${Math.round(impactScore)})`;
		case 'reference-instability':
			return `${c.unstablePropNames.length} unstable prop${c.unstablePropNames.length > 1 ? 's' : ''} causing reference-driven re-renders (impact: ${Math.round(impactScore)})`;
		case 'high-frequency':
			return `Rendering at high frequency (${c.renderVelocity.toFixed(1)} renders/s) — investigate parent state triggers (impact: ${Math.round(impactScore)})`;
		case 'score-degradation':
			return `Health score declining over session — average ${c.averageScore}, worst ${c.minScore ?? 'N/A'} (impact: ${Math.round(impactScore)})`;
		case 'parent-cascade':
			return `${Math.round((c.noChangeRenderCount / Math.max(c.totalRenders, 1)) * 100)}% of renders triggered by parent with no prop changes — candidate for React.memo (impact: ${Math.round(impactScore)})`;
		case 'no-change-renders':
			return `${c.noChangeRenderCount} renders with no observable prop changes (impact: ${Math.round(impactScore)})`;
	}
};

export const rankBottlenecks = (components: readonly ComponentAnalysis[], _correlations: readonly CorrelationGroup[], maxBottlenecks: number): readonly Bottleneck[] => {
	if (components.length === 0) return Object.freeze([]);

	const maxRenders = Math.max(...components.map((c) => c.totalRenders), 1);

	const scored = components.map((c) => {
		const renderRatio = c.totalRenders / maxRenders;
		const impactScore = computeImpactScore(c, renderRatio);
		const category = dominantCategory(c);
		return { c, impactScore, category };
	});

	scored.sort((a, b) => {
		if (Math.abs(a.impactScore - b.impactScore) > 0.001) return b.impactScore - a.impactScore;
		return a.c.componentName.localeCompare(b.c.componentName);
	});

	return Object.freeze(
		scored.slice(0, maxBottlenecks).map(({ c, impactScore, category }, idx) => ({
			rank: idx + 1,
			componentName: c.componentName,
			category,
			impactScore: Math.round(impactScore * 10) / 10,
			description: buildDescription(c, category, impactScore),
			evidence: buildEvidence(c, category),
		}))
	);
};
