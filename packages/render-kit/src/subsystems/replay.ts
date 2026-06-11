import { buildReplaySessions, createReplayEngine, ReplayError, type ReplayEngine, type ReplayEngineOptions, type ReplaySession, type ReplaySessionId, type ReplaySource } from '@sapanmozammel/render-replay-engine';
import type { TelemetryBuffer, TelemetryEvent } from '@sapanmozammel/render-telemetry-core';
import { RenderKitError } from '../errors/kit-error.js';
import type { ResolvedRenderKitConfig, RenderKitReplay } from '../types/index.js';

const handleReplayError = (e: unknown, allowEmptySource: boolean): readonly ReplaySession[] => {
	if (e instanceof ReplayError) {
		if (allowEmptySource && e.code === 'EMPTY_SOURCE') return Object.freeze([]);
		throw new RenderKitError('REPLAY_FAILED', e.message);
	}
	throw new RenderKitError('REPLAY_FAILED', e instanceof Error ? e.message : String(e));
};

export const createReplaySubsystem = (config: ResolvedRenderKitConfig['replay'], buffer: TelemetryBuffer): RenderKitReplay => {
	const kitOptions: ReplayEngineOptions = {
		maxFrames: config.maxFrames,
		pruningStrategy: config.pruningStrategy,
	};

	return Object.freeze({
		enabled: config.enabled,
		fromBuffer: (options?: ReplayEngineOptions): readonly ReplaySession[] => {
			try {
				return buildReplaySessions({ type: 'buffer', buffer }, { ...kitOptions, ...options });
			} catch (e) {
				return handleReplayError(e, true);
			}
		},
		fromEvents: (events: readonly TelemetryEvent[], options?: ReplayEngineOptions): readonly ReplaySession[] => {
			try {
				return buildReplaySessions({ type: 'events', events }, { ...kitOptions, ...options });
			} catch (e) {
				return handleReplayError(e, true);
			}
		},
		fromSerialized: (json: string, options?: ReplayEngineOptions): readonly ReplaySession[] => {
			try {
				return buildReplaySessions({ type: 'serialized', json }, { ...kitOptions, ...options });
			} catch (e) {
				return handleReplayError(e, false);
			}
		},
		engine: (source: ReplaySource, sessionId?: string, options?: ReplayEngineOptions): ReplayEngine => {
			try {
				return createReplayEngine(source, sessionId as ReplaySessionId | undefined, {
					...kitOptions,
					...options,
				});
			} catch (e) {
				if (e instanceof ReplayError) {
					throw new RenderKitError('REPLAY_FAILED', e.message);
				}
				throw new RenderKitError('REPLAY_FAILED', e instanceof Error ? e.message : String(e));
			}
		},
	});
};

const EMPTY_SESSIONS = Object.freeze([]) as readonly ReplaySession[];

export const createDisabledReplay = (): RenderKitReplay =>
	Object.freeze({
		enabled: false,
		fromBuffer: (): readonly ReplaySession[] => EMPTY_SESSIONS,
		fromEvents: (): readonly ReplaySession[] => EMPTY_SESSIONS,
		fromSerialized: (): readonly ReplaySession[] => EMPTY_SESSIONS,
		engine: (): ReplayEngine => {
			throw new RenderKitError('DISABLED', 'render-kit replay subsystem is disabled');
		},
	});
