import { createTelemetryBuffer, registerTransport } from '@sapanmozammel/render-telemetry-core';
import { resolveConfig } from '../config/kit-config.js';
import { createTelemetrySubsystem, createDisabledTelemetry } from '../subsystems/telemetry.js';
import { createReplaySubsystem, createDisabledReplay } from '../subsystems/replay.js';
import { createIntelligenceSubsystem, createDisabledIntelligence } from '../subsystems/intelligence.js';
import type { RenderKit, RenderKitConfig, ResolvedRenderKitConfig } from '../types/index.js';

const createDisabledKit = (resolved: ResolvedRenderKitConfig): RenderKit => {
	const intelligence = createDisabledIntelligence();
	return Object.freeze({
		config: resolved,
		enabled: false,
		telemetry: createDisabledTelemetry(),
		replay: createDisabledReplay(),
		analyze: intelligence.analyze,
		destroy: (): void => undefined,
	});
};

export const createRenderKit = (config: RenderKitConfig = {}): RenderKit => {
	const resolved = resolveConfig(config);

	if (!resolved.enabled) {
		return createDisabledKit(resolved);
	}

	const buffer = createTelemetryBuffer({ maxEvents: resolved.telemetry.maxEvents });
	const deregFns: Array<() => void> = [];

	resolved.telemetry.transports.forEach((t) => {
		deregFns.push(registerTransport(t));
	});

	const telemetry = createTelemetrySubsystem(resolved.telemetry, buffer, deregFns);
	const replay = createReplaySubsystem(resolved.replay, buffer);
	const intelligence = createIntelligenceSubsystem(resolved.intelligence, buffer);

	let destroyed = false;

	const destroy = (): void => {
		if (destroyed) return;
		destroyed = true;
		// Reverse order teardown
		for (let i = resolved.plugins.length - 1; i >= 0; i--) {
			const p = resolved.plugins[i]!;
			try {
				p.onDestroy?.(kit);
			} catch (e) {
				console.error(`[render-kit] plugin "${p.id}" onDestroy threw:`, e);
			}
		}
		deregFns.forEach((fn) => fn());
		deregFns.length = 0;
		buffer.clear();
	};

	const kit: RenderKit = {
		config: resolved,
		enabled: true,
		telemetry,
		replay,
		analyze: intelligence.analyze,
		destroy,
	};

	// Forward order init — freeze AFTER all onInit calls
	resolved.plugins.forEach((p) => {
		try {
			p.onInit?.(kit);
		} catch (e) {
			console.error(`[render-kit] plugin "${p.id}" onInit threw:`, e);
		}
	});

	return Object.freeze(kit);
};
