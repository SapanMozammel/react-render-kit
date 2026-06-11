import type { RenderKitConfig, RenderKitPlugin, ResolvedRenderKitConfig } from '../types/index.js';

const clamp = (value: number, min: number, max: number, field: string): number => {
	if (value < min) {
		console.warn(`[render-kit] ${field} clamped to ${min}`);
		return min;
	}
	if (value > max) {
		console.warn(`[render-kit] ${field} clamped to ${max}`);
		return max;
	}
	return value;
};

const clampMin = (value: number, min: number, field: string): number => {
	if (value < min) {
		console.warn(`[render-kit] ${field} clamped to ${min}`);
		return min;
	}
	return value;
};

export const resolveConfig = (config: RenderKitConfig): ResolvedRenderKitConfig => {
	const globalEnabled = config.enabled ?? (typeof process !== 'undefined' ? process.env?.NODE_ENV !== 'production' : true);

	const telemetryEnabled = config.telemetry?.enabled ?? globalEnabled;
	const replayEnabled = config.replay?.enabled ?? globalEnabled;
	const intelligenceEnabled = config.intelligence?.enabled ?? globalEnabled;

	const rawMaxEvents = config.telemetry?.maxEvents ?? 1000;
	const rawMaxFrames = config.replay?.maxFrames ?? 100;
	const rawMaxBottlenecks = config.intelligence?.maxBottlenecks ?? 10;
	const rawMaxRecommendations = config.intelligence?.maxRecommendations ?? 20;
	const rawConfidenceThreshold = config.intelligence?.confidenceThreshold ?? 0.3;
	const rawCorrelationWindowMs = config.intelligence?.correlationWindowMs ?? 16;

	const maxEvents = clampMin(rawMaxEvents, 1, 'telemetry.maxEvents');
	const maxFrames = clampMin(rawMaxFrames, 1, 'replay.maxFrames');
	const maxBottlenecks = clampMin(rawMaxBottlenecks, 1, 'intelligence.maxBottlenecks');
	const maxRecommendations = clampMin(rawMaxRecommendations, 1, 'intelligence.maxRecommendations');
	const confidenceThreshold = clamp(rawConfidenceThreshold, 0, 1, 'intelligence.confidenceThreshold');
	const correlationWindowMs = clampMin(rawCorrelationWindowMs, 1, 'intelligence.correlationWindowMs');

	// Validate plugins — skip empty/whitespace ids, warn on duplicates
	const seenIds = new Set<string>();
	const validPlugins: RenderKitPlugin[] = [];
	const rawPlugins = config.plugins ?? [];
	rawPlugins.forEach((plugin, index) => {
		if (!plugin.id || plugin.id.trim() === '') {
			console.warn(`[render-kit] plugin at index ${index} has empty id — skipped`);
			return;
		}
		if (seenIds.has(plugin.id)) {
			console.warn(`[render-kit] duplicate plugin id "${plugin.id}" at index ${index}`);
		}
		seenIds.add(plugin.id);
		validPlugins.push(plugin);
	});

	// Collect analysisPlugins from kit plugins and prepend to intelligence.plugins
	const kitAnalysisPlugins = validPlugins.filter((p) => p.analysisPlugin !== undefined).map((p) => p.analysisPlugin!);
	const callerIntelligencePlugins = config.intelligence?.plugins ?? [];
	const intelligencePlugins = [...kitAnalysisPlugins, ...callerIntelligencePlugins];

	return {
		enabled: globalEnabled,
		telemetry: {
			enabled: telemetryEnabled,
			maxEvents,
			transports: config.telemetry?.transports ?? [],
		},
		replay: {
			enabled: replayEnabled,
			maxFrames,
			pruningStrategy: config.replay?.pruningStrategy ?? 'fifo',
		},
		intelligence: {
			enabled: intelligenceEnabled,
			maxBottlenecks,
			maxRecommendations,
			confidenceThreshold,
			correlationWindowMs,
			includeWellOptimized: config.intelligence?.includeWellOptimized ?? false,
			plugins: intelligencePlugins,
		},
		plugins: validPlugins,
	};
};
