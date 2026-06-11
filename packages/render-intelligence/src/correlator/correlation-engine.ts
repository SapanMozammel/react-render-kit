import type { TelemetryEvent, RenderEvent } from '@sapanmozammel/render-core-schema';
import type { ComponentSessionData, CorrelationGroup, CorrelationEvidence } from '../types/index.js';

const isRenderEvent = (e: TelemetryEvent): e is RenderEvent => e.type === 'render';

const getTimestamps = (data: readonly ComponentSessionData[], componentName: string): number[] => {
	const timestamps: number[] = [];
	for (const session of data) {
		if (session.componentName !== componentName) continue;
		for (const event of session.events) {
			if (isRenderEvent(event)) timestamps.push(event.wallTimestamp);
		}
	}
	return timestamps.sort((a, b) => a - b);
};

const binarySearchClosest = (sorted: number[], target: number): number | null => {
	if (sorted.length === 0) return null;
	let lo = 0;
	let hi = sorted.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (sorted[mid]! < target) lo = mid + 1;
		else hi = mid;
	}
	const candidates = [sorted[lo]!];
	if (lo > 0) candidates.push(sorted[lo - 1]!);
	return candidates.reduce((best, c) => (Math.abs(c - target) < Math.abs(best - target) ? c : best));
};

type ProximatePair = { tA: number; tB: number; aBeforeB: boolean };

const findProximatePairs = (tsA: number[], tsB: number[], windowMs: number): ProximatePair[] => {
	const pairs: ProximatePair[] = [];
	for (const tA of tsA) {
		const closest = binarySearchClosest(tsB, tA);
		if (closest !== null && Math.abs(tA - closest) <= windowMs) {
			pairs.push({ tA, tB: closest, aBeforeB: tA <= closest });
		}
	}
	return pairs;
};

const detectSpikes = (tsA: number[], tsB: number[], spikeWindowMs = 100): number => {
	if (tsA.length < 3 || tsB.length < 3) return 0;
	let spikeCount = 0;
	let aIdx = 0;

	for (let i = 0; i < tsA.length - 2; i++) {
		const windowStart = tsA[i]!;
		const windowEnd = windowStart + spikeWindowMs;
		let aInWindow = 0;
		for (let j = i; j < tsA.length && tsA[j]! <= windowEnd; j++) aInWindow++;
		if (aInWindow < 3) continue;

		let bInWindow = 0;
		while (aIdx < tsB.length && tsB[aIdx]! < windowStart) aIdx++;
		for (let k = aIdx; k < tsB.length && tsB[k]! <= windowEnd; k++) bInWindow++;
		if (bInWindow >= 3) spikeCount++;
	}
	return spikeCount;
};

export const detectCorrelations = (data: readonly ComponentSessionData[], windowMs: number): readonly CorrelationGroup[] => {
	const componentNames = [...new Set(data.map((d) => d.componentName))];
	if (componentNames.length < 2) return Object.freeze([]);

	const timestampCache = new Map<string, number[]>();
	const getTs = (name: string): number[] => {
		if (!timestampCache.has(name)) timestampCache.set(name, getTimestamps(data, name));
		return timestampCache.get(name)!;
	};

	const groups: CorrelationGroup[] = [];

	for (let i = 0; i < componentNames.length; i++) {
		for (let j = i + 1; j < componentNames.length; j++) {
			const nameA = componentNames[i]!;
			const nameB = componentNames[j]!;
			const tsA = getTs(nameA);
			const tsB = getTs(nameB);

			if (tsA.length < 5 || tsB.length < 5) continue;

			const pairs = findProximatePairs(tsA, tsB, windowMs);
			if (pairs.length < 5) continue;

			const minLen = Math.min(tsA.length, tsB.length);
			const proximityRatio = pairs.length / minLen;

			if (proximityRatio >= 0.5) {
				const avgGapMs = pairs.reduce((sum, p) => sum + Math.abs(p.tA - p.tB), 0) / pairs.length;
				const evidence: CorrelationEvidence[] = [
					{ type: 'timestamp-proximity', avgGapMs: Math.round(avgGapMs), sampleCount: pairs.length },
				];

				const aBeforeCount = pairs.filter((p) => p.aBeforeB).length;
				const cascadeRatio = aBeforeCount / pairs.length;

				if (cascadeRatio >= 0.7) {
					groups.push({
						type: 'probable-cascade',
						components: [nameA, nameB],
						confidence: Math.min(1, proximityRatio),
						description: `${nameA} likely triggers ${nameB} — ${nameA} renders before ${nameB} in ${Math.round(cascadeRatio * 100)}% of correlated pairs`,
						evidence: [...evidence, { type: 'render-sequence', sequenceCount: pairs.length, maxGapMs: windowMs }],
					});
				} else if (cascadeRatio <= 0.3) {
					groups.push({
						type: 'probable-cascade',
						components: [nameB, nameA],
						confidence: Math.min(1, proximityRatio),
						description: `${nameB} likely triggers ${nameA} — ${nameB} renders before ${nameA} in ${Math.round((1 - cascadeRatio) * 100)}% of correlated pairs`,
						evidence: [...evidence, { type: 'render-sequence', sequenceCount: pairs.length, maxGapMs: windowMs }],
					});
				} else {
					groups.push({
						type: 'synchronized-renders',
						components: [nameA, nameB],
						confidence: Math.min(1, proximityRatio),
						description: `${nameA} and ${nameB} render within ${windowMs}ms of each other in ${Math.round(proximityRatio * 100)}% of cases — likely triggered by a shared parent`,
						evidence,
					});
				}
			} else if (proximityRatio >= 0.3) {
				const spikeCount = detectSpikes(tsA, tsB);
				if (spikeCount >= 2) {
					groups.push({
						type: 'shared-render-spike',
						components: [nameA, nameB],
						confidence: Math.min(1, spikeCount / 5),
						description: `${nameA} and ${nameB} share ${spikeCount} render spikes — possibly driven by the same state update burst`,
						evidence: [{ type: 'simultaneous-spike', spikeCount, windowMs: 100 }],
					});
				}
			}
		}
	}

	return Object.freeze(groups);
};
