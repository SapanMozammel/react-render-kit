import type { ComponentAnalysis, CorrelationGroup, RootCause, RootCauseKind } from '../types/index.js';

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

type RootCauseCandidate = {
	kind: RootCauseKind;
	confidence: number;
	affectedComponents: string[];
	causalChain: string[];
};

const detectReferenceInstability = (c: ComponentAnalysis): RootCauseCandidate | null => {
	if (c.unstablePropNames.length === 0) return null;
	const ineffectiveRatio = c.totalRenders > 0 ? c.ineffectiveRenderCount / c.totalRenders : 0;
	const hasMemoDefeat = c.memoClassification === 'INEFFECTIVE';
	const confidence = clamp((c.unstablePropNames.length > 1 ? 0.7 : 0.5) + (hasMemoDefeat ? 0.2 : 0) + ineffectiveRatio * 0.1, 0, 1);

	const propList = c.unstablePropNames.slice(0, 3).join(', ');
	const chain: string[] = [
		`${c.componentName} receives unstable prop references: ${propList}`,
		'Props create new object/function references on every parent render',
		hasMemoDefeat ? 'React.memo receives a new reference → bails out of the optimization → component re-renders' : 'Component re-renders even when underlying data is unchanged',
		'Fix: stabilize these props with useCallback (functions) or useMemo (objects/arrays) at the call site',
	];
	return { kind: 'reference-instability', confidence, affectedComponents: [], causalChain: chain };
};

const detectParentCascade = (c: ComponentAnalysis): RootCauseCandidate | null => {
	if (c.totalRenders === 0) return null;
	const noChangeRatio = c.noChangeRenderCount / c.totalRenders;
	if (noChangeRatio < 0.5) return null;
	const confidence = clamp(noChangeRatio, 0, 1);
	const chain: string[] = [
		`${Math.round(noChangeRatio * 100)}% of ${c.componentName}'s renders are triggered by parent re-renders`,
		'No prop changes were detected — this component renders because its parent does',
		'The component is not wrapped in React.memo, so it cannot skip the render',
		'Fix: wrap this component in React.memo, or move state closer to where it is consumed',
	];
	return { kind: 'parent-cascade', confidence, affectedComponents: [], causalChain: chain };
};

const detectHighFrequencySource = (c: ComponentAnalysis): RootCauseCandidate | null => {
	if (c.frequencyClass !== 'HIGH') return null;
	const confidence = clamp(0.6 + c.renderVelocity * 0.01, 0, 0.95);
	const chain: string[] = [
		`${c.componentName} is rendering at HIGH frequency (${c.renderVelocity.toFixed(1)} renders/s)`,
		'This can cascade to children and context subscribers that depend on this component',
		'Common causes: rapid state updates, polling, animation frames, or context thrashing',
		'Fix: debounce state updates, use a selector pattern to narrow context subscriptions, or batch updates',
	];
	return { kind: 'high-frequency-source', confidence, affectedComponents: [], causalChain: chain };
};

const detectMemoDefeat = (c: ComponentAnalysis): RootCauseCandidate | null => {
	if (c.memoClassification !== 'INEFFECTIVE') return null;
	if (c.unstablePropNames.length === 0) return null;
	const confidence = clamp(0.8 + (c.totalRenders > 10 ? 0.1 : 0), 0, 1);
	const propList = c.unstablePropNames.slice(0, 3).join(', ');
	const chain: string[] = [
		`${c.componentName} is wrapped in React.memo but all observed re-renders were reference-only`,
		`Unstable props (${propList}) receive new references on every render, negating the memo`,
		`Every render of the parent propagates to ${c.componentName} despite no data change`,
		'Fix: stabilize all props listed in reference-instability recommendations',
	];
	return { kind: 'memo-defeat', confidence, affectedComponents: [], causalChain: chain };
};

const getCascadeAffected = (componentName: string, correlations: readonly CorrelationGroup[]): string[] => {
	const affected: string[] = [];
	for (const g of correlations) {
		if (g.type !== 'probable-cascade') continue;
		if (g.components[0] === componentName && g.components[1] !== undefined) {
			affected.push(g.components[1]);
		}
	}
	return affected;
};

export const analyzeRootCauses = (components: readonly ComponentAnalysis[], correlations: readonly CorrelationGroup[], confidenceThreshold: number): readonly RootCause[] => {
	const results: RootCause[] = [];

	for (const c of components) {
		const candidates: RootCauseCandidate[] = [];

		const memoDefeat = detectMemoDefeat(c);
		if (memoDefeat !== null) candidates.push(memoDefeat);

		const refInstability = detectReferenceInstability(c);
		if (refInstability !== null && memoDefeat === null) candidates.push(refInstability);

		const highFreq = detectHighFrequencySource(c);
		if (highFreq !== null) candidates.push(highFreq);

		const parentCascade = detectParentCascade(c);
		if (parentCascade !== null && memoDefeat === null && refInstability === null) candidates.push(parentCascade);

		if (candidates.length === 0) continue;

		candidates.sort((a, b) => b.confidence - a.confidence);
		const best = candidates[0]!;
		if (best.confidence < confidenceThreshold) continue;

		const affectedComponents = best.kind === 'high-frequency-source' || best.kind === 'memo-defeat' ? getCascadeAffected(c.componentName, correlations) : best.affectedComponents;

		results.push({
			componentName: c.componentName,
			kind: best.kind,
			confidence: Math.round(best.confidence * 100) / 100,
			affectedComponents: Object.freeze(affectedComponents),
			description: best.causalChain[0] ?? '',
			causalChain: Object.freeze(best.causalChain),
		});
	}

	results.sort((a, b) => b.confidence - a.confidence);
	return Object.freeze(results);
};
