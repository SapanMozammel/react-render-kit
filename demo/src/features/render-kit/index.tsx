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
		// 3. Push one synthetic render event
		const { event } = buildSyntheticEvent();
		kit.telemetry.buffer.push(event);

		const eventCount = kit.telemetry.snapshot().events.length;

		// 4. Analyze
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
			<div className='console-panel'>
				<div className='console-panel__header'>render-kit — Minimal Integration</div>
				<div className='console-panel__body'>
					{/* Step 1 — Install */}
					<div className='console-panel__row'>
						<span className='console-panel__label'>1. Install</span>
						<pre className='console-panel__value' style={{ margin: 0 }}>
							npm install @sapanmozammel/render-kit
						</pre>
					</div>

					{/* Step 2 — Resolved config */}
					<div className='console-panel__row'>
						<span className='console-panel__label'>2. Init (resolved config)</span>
						<pre className='console-panel__value' style={{ margin: 0, fontSize: '0.75rem' }}>
							{configJson}
						</pre>
					</div>

					{/* Step 3 — Event pushed */}
					<div className='console-panel__row'>
						<span className='console-panel__label'>3. Event pushed</span>
						<span className='console-panel__value'>
							buffer.events = {demoResult.eventCount}
						</span>
					</div>

					{/* Step 4 — Analysis result */}
					<div className='console-panel__row'>
						<span className='console-panel__label'>4. Analysis</span>
						{demoResult.report ? (
							<span className='console-panel__value'>
								grade: <strong>{demoResult.report.applicationHealth.grade}</strong>
								{' · '}
								bottlenecks: {demoResult.report.bottlenecks.length}
							</span>
						) : (
							<span className='console-panel__value console-panel__value--error'>
								{demoResult.analyzeError ?? 'no data'}
							</span>
						)}
					</div>
				</div>
			</div>

			<details className='code-hint'>
				<summary>How to use render-kit</summary>
				<div className='code-hint__body'>
					<pre className='code-hint__pre'>{`import { createRenderKit, RenderKitProvider, useRenderKit } from '@sapanmozammel/render-kit';

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
					<p className='code-hint__note'>
						One install pulls all 11 react-render-kit packages as dependencies. Every hook and
						component from the ecosystem is also re-exported from this single entry point.
					</p>
				</div>
			</details>
		</>
	);
};

export default RenderKitDemo;
