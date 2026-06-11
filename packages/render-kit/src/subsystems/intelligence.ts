import { analyzeRenders, IntelligenceError, type AnalysisPlugin, type IntelligenceOptions, type IntelligenceReport, type IntelligenceSource } from '@sapanmozammel/render-intelligence';
import type { TelemetryBuffer } from '@sapanmozammel/render-telemetry-core';
import { RenderKitError } from '../errors/kit-error.js';
import type { ResolvedRenderKitConfig } from '../types/index.js';

type IntelligenceSubsystem = {
	readonly analyze: (source?: IntelligenceSource, options?: Partial<IntelligenceOptions>) => IntelligenceReport;
};

export const createIntelligenceSubsystem = (config: ResolvedRenderKitConfig['intelligence'], buffer: TelemetryBuffer): IntelligenceSubsystem => {
	const kitOptions: IntelligenceOptions = {
		maxBottlenecks: config.maxBottlenecks,
		maxRecommendations: config.maxRecommendations,
		confidenceThreshold: config.confidenceThreshold,
		correlationWindowMs: config.correlationWindowMs,
		includeWellOptimized: config.includeWellOptimized,
		plugins: [...config.plugins] as AnalysisPlugin[],
	};

	const analyze = (source?: IntelligenceSource, options?: Partial<IntelligenceOptions>): IntelligenceReport => {
		const effectiveSource: IntelligenceSource = source ?? {
			type: 'events',
			events: [...buffer.getSnapshot().events],
		};

		const kitPlugins: readonly AnalysisPlugin[] = kitOptions.plugins ?? [];
		const callerPlugins: readonly AnalysisPlugin[] = options?.plugins ?? [];
		const mergedOptions: IntelligenceOptions = {
			...kitOptions,
			...options,
			// kit plugins run BEFORE caller-provided plugins
			plugins: [...kitPlugins, ...callerPlugins],
		};

		try {
			return analyzeRenders(effectiveSource, mergedOptions);
		} catch (e) {
			if (e instanceof IntelligenceError) {
				throw new RenderKitError('ANALYSIS_FAILED', e.message);
			}
			throw new RenderKitError('ANALYSIS_FAILED', e instanceof Error ? e.message : String(e));
		}
	};

	return Object.freeze({ analyze });
};

export const createDisabledIntelligence = (): IntelligenceSubsystem =>
	Object.freeze({
		analyze: (): never => {
			throw new RenderKitError('DISABLED', 'render-kit intelligence subsystem is disabled');
		},
	});
