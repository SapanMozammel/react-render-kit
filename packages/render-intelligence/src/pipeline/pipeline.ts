import { CURRENT_SCHEMA_VERSION } from '@sapanmozammel/render-core-schema';
import type { ComponentAnalysis, IntelligenceSource, IntelligenceOptions, IntelligenceReport } from '../types/index.js';
import { IntelligenceError } from '../errors/intelligence-error.js';
import { fromSnapshot } from '../adapters/from-snapshot.js';
import { fromEvents } from '../adapters/from-events.js';
import { fromReplay } from '../adapters/from-replay.js';
import { partitionSessions } from '../partitioner/session-partitioner.js';
import { analyzeComponents as analyzeComponentsFn } from '../analyzer/component-analyzer.js';
import { scoreApplication } from '../scorer/application-scorer.js';
import { detectCorrelations } from '../correlator/correlation-engine.js';
import { rankBottlenecks as rankBottlenecksFn } from '../ranker/bottleneck-ranker.js';
import { analyzeRootCauses } from '../root-cause/root-cause-analyzer.js';
import { generateRecommendations } from '../recommender/intelligence-recommender.js';
import { executePlugins } from '../plugins/plugin-registry.js';

const DEFAULT_MAX_BOTTLENECKS = 10;
const DEFAULT_MAX_RECOMMENDATIONS = 20;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.3;
const DEFAULT_CORRELATION_WINDOW_MS = 16;

const validateSource = (source: IntelligenceSource): void => {
	if (source.type === 'events' && source.events.length === 0) {
		throw new IntelligenceError('EMPTY_SOURCE', 'Source contains no events');
	}
	if (source.type === 'snapshot' && source.snapshot.events.length === 0) {
		throw new IntelligenceError('EMPTY_SOURCE', 'Snapshot contains no events');
	}
	if (source.type === 'replay' && source.sessions.length === 0) {
		throw new IntelligenceError('EMPTY_SOURCE', 'Source contains no replay sessions');
	}
};

export const analyzeRenders = (source: IntelligenceSource, options: IntelligenceOptions = {}): IntelligenceReport => {
	validateSource(source);

	const maxBottlenecks = options.maxBottlenecks ?? DEFAULT_MAX_BOTTLENECKS;
	const maxRecommendations = options.maxRecommendations ?? DEFAULT_MAX_RECOMMENDATIONS;
	const confidenceThreshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
	const correlationWindowMs = options.correlationWindowMs ?? DEFAULT_CORRELATION_WINDOW_MS;
	const plugins = options.plugins ?? [];

	// Step 1: Normalize source to ComponentSessionData[]
	const rawData = source.type === 'snapshot' ? fromSnapshot(source.snapshot) : source.type === 'events' ? fromEvents(source.events) : fromReplay(source.sessions);

	// Step 2: Partition (merge duplicate sessions)
	const data = partitionSessions(rawData);

	// Step 3: Per-component analysis
	const components = analyzeComponentsFn(data);

	// Step 4: Application health score
	const health = scoreApplication(components, source.type);

	// Step 5: Correlation detection + bottleneck ranking (independent)
	const correlations = detectCorrelations(data, correlationWindowMs);
	const bottlenecks = rankBottlenecksFn(components, correlations, maxBottlenecks);

	// Step 6: Root-cause analysis
	const rootCauses = analyzeRootCauses(components, correlations, confidenceThreshold);

	// Step 7: Recommendations
	const recommendationOptions: Pick<IntelligenceOptions, 'maxRecommendations' | 'includeWellOptimized'> =
		options.includeWellOptimized !== undefined ? { maxRecommendations, includeWellOptimized: options.includeWellOptimized } : { maxRecommendations };
	const recommendations = generateRecommendations(components, bottlenecks, rootCauses, correlations, health, recommendationOptions);

	// Step 8: Plugins
	const pluginResult = executePlugins(plugins, { source, components, health, correlations });

	// Step 9: Merge plugin results + assemble report
	const finalBottlenecks = Object.freeze([...bottlenecks, ...(pluginResult.bottlenecks ?? [])].slice(0, maxBottlenecks));
	const finalRootCauses = Object.freeze([...rootCauses, ...(pluginResult.rootCauses ?? [])]);
	const finalCorrelations = Object.freeze([...correlations, ...(pluginResult.correlations ?? [])]);
	const finalRecommendations = Object.freeze([...recommendations, ...(pluginResult.recommendations ?? [])].slice(0, maxRecommendations));

	return {
		schemaVersion: CURRENT_SCHEMA_VERSION,
		generatedAt: Date.now(),
		applicationHealth: health,
		components,
		bottlenecks: finalBottlenecks,
		rootCauses: finalRootCauses,
		correlations: finalCorrelations,
		recommendations: finalRecommendations,
	};
};

export const analyzeComponents = (source: IntelligenceSource): readonly ComponentAnalysis[] => {
	validateSource(source);
	const rawData = source.type === 'snapshot' ? fromSnapshot(source.snapshot) : source.type === 'events' ? fromEvents(source.events) : fromReplay(source.sessions);
	const data = partitionSessions(rawData);
	return analyzeComponentsFn(data);
};

export const rankBottlenecks = (components: readonly ComponentAnalysis[], options: Pick<IntelligenceOptions, 'maxBottlenecks'> = {}) =>
	rankBottlenecksFn(components, [], options.maxBottlenecks ?? DEFAULT_MAX_BOTTLENECKS);
