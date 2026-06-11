import type { AnalysisPlugin, AnalysisContext, PluginResult } from '../types/index.js';

const mergeResults = (results: PluginResult[]): PluginResult => ({
	bottlenecks: Object.freeze(results.flatMap((r) => r.bottlenecks ?? [])),
	rootCauses: Object.freeze(results.flatMap((r) => r.rootCauses ?? [])),
	recommendations: Object.freeze(results.flatMap((r) => r.recommendations ?? [])),
	correlations: Object.freeze(results.flatMap((r) => r.correlations ?? [])),
});

export const executePlugins = (plugins: readonly AnalysisPlugin[], context: AnalysisContext): PluginResult => {
	if (plugins.length === 0) return { bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] };

	const results: PluginResult[] = [];

	for (const plugin of plugins) {
		if (typeof plugin.id !== 'string' || plugin.id.trim().length === 0) {
			console.error('[render-intelligence] Plugin has invalid or empty id — skipping');
			continue;
		}

		try {
			const result = plugin.analyze(context);
			results.push(result);
		} catch (err) {
			console.error(`[render-intelligence] Plugin "${plugin.id}" threw during analysis:`, err);
		}
	}

	return mergeResults(results);
};

export const createPlugin = (definition: AnalysisPlugin): AnalysisPlugin => ({
	id: definition.id,
	name: definition.name,
	version: definition.version,
	analyze: definition.analyze,
});
