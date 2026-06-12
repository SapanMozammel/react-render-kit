'use client';

import { useMemo, useRef } from 'react';
import {
	createRenderKit,
	createTelemetrySession,
	createRenderEvent,
} from '@sapanmozammel/render-kit';
import type { RenderKit, IntelligenceReport } from '@sapanmozammel/render-kit';

const buildSyntheticEvent = () => {
	let session = createTelemetrySession('DemoComponent');
	const { event, session: updatedSession } = createRenderEvent(session, {
		renderNumber: 1,
		triggeredBy: 'props',
	});
	session = updatedSession;
	return { event, session };
};

export const RenderKitDemo = () => {
	const kitRef = useRef<RenderKit | null>(null);
	if (kitRef.current === null) {
		kitRef.current = createRenderKit();
	}
	const kit = kitRef.current;

	const demoResult = useMemo(() => {
		const { event } = buildSyntheticEvent();
		kit.telemetry.buffer.push(event);

		const eventCount = kit.telemetry.snapshot().events.length;

		let report: IntelligenceReport | null = null;
		let analyzeError: string | null = null;
		try {
			report = kit.analyze();
		} catch (e) {
			analyzeError = e instanceof Error ? e.message : String(e);
		}

		return { eventCount, report, analyzeError };
	}, [kit]);

	const configJson = JSON.stringify(
		{
			enabled: kit.config.enabled,
			telemetry: {
				enabled: kit.config.telemetry.enabled,
				maxEvents: kit.config.telemetry.maxEvents,
			},
			replay: {
				enabled: kit.config.replay.enabled,
				maxFrames: kit.config.replay.maxFrames,
				pruningStrategy: kit.config.replay.pruningStrategy,
			},
			intelligence: {
				enabled: kit.config.intelligence.enabled,
				maxBottlenecks: kit.config.intelligence.maxBottlenecks,
				confidenceThreshold: kit.config.intelligence.confidenceThreshold,
			},
		},
		null,
		2,
	);

	return (
		<>
			<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
				<div className="px-3.5 py-2.5 border-b border-edge bg-raised text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">
					render-kit — Minimal Integration
				</div>
				<div className="divide-y divide-edge">
					<div className="flex items-start gap-3 px-3.5 py-3">
						<span className="text-[11px] text-dim w-40 shrink-0 pt-0.5 uppercase tracking-[0.06em]">1. Install</span>
						<pre className="text-xs text-ink break-all flex-1" style={{ margin: 0 }}>
							npm install @sapanmozammel/render-kit
						</pre>
					</div>

					<div className="flex items-start gap-3 px-3.5 py-3">
						<span className="text-[11px] text-dim w-40 shrink-0 pt-0.5 uppercase tracking-[0.06em]">2. Init (resolved config)</span>
						<pre className="text-xs text-ink break-all flex-1" style={{ margin: 0, fontSize: '0.75rem' }}>
							{configJson}
						</pre>
					</div>

					<div className="flex items-start gap-3 px-3.5 py-3">
						<span className="text-[11px] text-dim w-40 shrink-0 pt-0.5 uppercase tracking-[0.06em]">3. Event pushed</span>
						<span className="text-xs text-ink break-all flex-1">
							buffer.events = {demoResult.eventCount}
						</span>
					</div>

					<div className="flex items-start gap-3 px-3.5 py-3">
						<span className="text-[11px] text-dim w-40 shrink-0 pt-0.5 uppercase tracking-[0.06em]">4. Analysis</span>
						{demoResult.report ? (
							<span className="text-xs text-ink break-all flex-1">
								grade: <strong>{demoResult.report.applicationHealth.grade}</strong>
								{' · '}
								bottlenecks: {demoResult.report.bottlenecks.length}
							</span>
						) : (
							<span className="text-xs text-error break-all flex-1">
								{demoResult.analyzeError ?? 'no data'}
							</span>
						)}
					</div>
				</div>
			</div>

			<details className="border border-edge rounded-[10px] overflow-hidden group mt-2">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					How to use render-kit
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import { createRenderKit, RenderKitProvider, useRenderKit } from '@sapanmozammel/render-kit';

// 1. Create a kit instance (one per app)
const kit = createRenderKit({
  telemetry: { maxEvents: 500 },
  replay:    { maxFrames: 50 },
  intelligence: { confidenceThreshold: 0.5 },
  plugins: [myPlugin],
});

// 2. Provide it via React context
<RenderKitProvider kit={kit}>
  <App />
</RenderKitProvider>

// 3. Use it anywhere inside the provider
const kit = useRenderKit();

// Telemetry
const session = kit.telemetry.createSession('MyComponent');
kit.telemetry.buffer.push(event);
const snapshot = kit.telemetry.snapshot();

// Replay
const sessions = kit.replay.fromBuffer();
const engine   = kit.replay.engine(source);

// Intelligence
const report = kit.analyze();                        // defaults to buffer snapshot
const report = kit.analyze({ type: 'events', events });  // explicit source

// Cleanup
kit.destroy();  // idempotent`}</pre>
					<p className="text-xs text-dim leading-[1.6]">
						One install pulls all 11 react-render-kit packages as dependencies. Every hook and
						component from the ecosystem is also re-exported from this single entry point.
					</p>
				</div>
			</details>
		</>
	);
};

export default RenderKitDemo;
