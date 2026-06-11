export type ScenarioId =
	| 'basic-lifecycle'
	| 'prop-changes'
	| 'reference-instability'
	| 'full-pipeline';

export type ScenarioBadge = 'ok' | 'warn';

export type Scenario = {
	readonly id: ScenarioId;
	readonly label: string;
	readonly description: string;
	readonly badge: ScenarioBadge;
	readonly triggerLabel: string;
	readonly triggerBothTicks: boolean;
	readonly canFix: boolean;
	readonly fixDescription: string | undefined;
	readonly codeBreaking: string;
	readonly codeFixed: string | undefined;
};

export const SCENARIOS: readonly Scenario[] = [
	{
		id: 'basic-lifecycle',
		label: 'Basic Lifecycle',
		description:
			'A component with stable props is re-rendered by its parent. No prop-change event is emitted — only session-start, render, frequency, score, and recommendation. Watch the sequenceNumber increment monotonically.',
		badge: 'ok',
		triggerLabel: 'Re-render parent',
		triggerBothTicks: false,
		canFix: false,
		fixDescription: undefined,
		codeBreaking: `import {
  createTelemetryBuffer,
  createTelemetrySession,
  createSessionStartEvent,
  createRenderEvent,
  endTelemetrySession,
  createSessionEndEvent,
} from '@sapanmozammel/render-telemetry-core';
import { useSyncExternalStore, useEffect, useRef } from 'react';

// 1. Create buffer and session
const buffer = createTelemetryBuffer();
let session = createTelemetrySession('DemoTarget');

// 2. Emit session-start
const { event: startEv, session: s1 } = createSessionStartEvent(session);
session = s1;
buffer.push(startEv);
buffer.pushSession(session);

// 3. Subscribe to buffer for live display
const snapshot = useSyncExternalStore(
  buffer.subscribe,
  buffer.getSnapshot,
  buffer.getServerSnapshot,
);

// 4. Emit render event on each render
const { event: renderEv, session: s2 } = createRenderEvent(session, {
  renderNumber: 1,
  triggeredBy: 'parent',
});
session = s2;
buffer.push(renderEv);
buffer.updateSession(session);

// 5. End session on unmount
useEffect(() => {
  return () => {
    const ended = endTelemetrySession(session);
    const { event: endEv } = createSessionEndEvent(ended, { totalRenders: 1 });
    buffer.push(endEv);
    buffer.updateSession(ended);
  };
}, []);`,
		codeFixed: undefined,
	},
	{
		id: 'prop-changes',
		label: 'Prop Changes',
		description:
			'Each trigger increments a primitive counter prop. The prop-change event captures kind: "value-changed" for count. Session classification becomes EFFECTIVE — all signals are genuine data changes.',
		badge: 'ok',
		triggerLabel: 'Change data',
		triggerBothTicks: false,
		canFix: false,
		fixDescription: undefined,
		codeBreaking: `// Emit a prop-change event when props diff
const { event: propEv, session: s2 } = createPropChangeEvent(session, {
  renderNumber: 2,
  changed: [
    { kind: 'value-changed', key: 'count', prev: 0, next: 1 },
  ],
  unstable: [],
  inferredTrigger: 'genuine-prop-change',
  signalKind: 'genuine',
});
session = s2;
buffer.push(propEv);
buffer.updateSession(session);

// Each factory call increments session.sequenceCounter.
// Thread the returned session into the next factory.`,
		codeFixed: undefined,
	},
	{
		id: 'reference-instability',
		label: 'Reference Instability',
		description:
			'Tags (array) and onAction (function) get new references on every parent re-render even though their values are identical. Session degrades to INEFFECTIVE — React.memo cannot skip a single render. Score drops from instability + memo penalties.',
		badge: 'warn',
		triggerLabel: 'Re-render parent',
		triggerBothTicks: false,
		canFix: true,
		fixDescription: 'Stabilize reference props with useCallback and useMemo.',
		codeBreaking: `// ❌ Reference-only changes — new refs, same values
const { event: propEv, session: s2 } = createPropChangeEvent(session, {
  renderNumber: 2,
  changed: [
    { kind: 'reference-changed', key: 'tags', refType: 'array' },
    { kind: 'reference-changed', key: 'onAction', refType: 'function' },
  ],
  unstable: [
    { name: 'tags', type: 'array' },
    { name: 'onAction', type: 'function' },
  ],
  inferredTrigger: 'reference-instability',
  signalKind: 'reference-only',
});`,
		codeFixed: `// ✅ Stabilize with useCallback / useMemo
const tags = useMemo(() => ['admin', 'power-user'], []);
const onAction = useCallback(() => doSomething(), []);
// Now prop-change events are no longer emitted — memo skips these renders`,
	},
	{
		id: 'full-pipeline',
		label: 'Full Pipeline',
		description:
			'Both a primitive prop (count) and reference props (tags, onAction) change simultaneously. Mixed signals produce PARTIALLY_EFFECTIVE session. Combined with rapid triggering, all 7 event types appear in the stream.',
		badge: 'warn',
		triggerLabel: 'Cascade trigger',
		triggerBothTicks: true,
		canFix: true,
		fixDescription: 'Stabilize reference props to eliminate the reference-only component of mixed signals.',
		codeBreaking: `// ❌ Mixed signals: genuine data change + reference instability in same render
// Thread all 7 factories per render:
const { event: e1, session: s1 } = createSessionStartEvent(session);
const { event: e2, session: s2 } = createRenderEvent(s1, { renderNumber, triggeredBy: 'props' });
const { event: e3, session: s3 } = createPropChangeEvent(s2, {
  changed: [
    { kind: 'value-changed', key: 'count', prev: 0, next: 1 },
    { kind: 'reference-changed', key: 'tags', refType: 'array' },
  ],
  unstable: [{ name: 'tags', type: 'array' }],
  inferredTrigger: 'mixed',
  signalKind: 'mixed',
  renderNumber,
});
const { event: e4, session: s4 } = createFrequencyEvent(s3, { ... });
const { event: e5, session: s5 } = createScoreEvent(s4, { ... });
const { event: e6, session: s6 } = createRecommendationEvent(s5, { ... });
// On unmount:
const { event: e7 } = createSessionEndEvent(s6, { totalRenders: N });`,
		codeFixed: `// ✅ Stabilize reference props — only genuine changes remain
const tags = useMemo(() => ['admin', 'power-user'], []);
const onAction = useCallback(() => doSomething(), []);
// signalKind becomes 'genuine', session becomes EFFECTIVE`,
	},
];
