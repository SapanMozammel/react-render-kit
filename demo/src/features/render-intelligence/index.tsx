'use client';

import { useMemo, useState } from 'react';
import { analyzeRenders } from '@sapanmozammel/render-intelligence';
import type { IntelligenceReport } from '@sapanmozammel/render-intelligence';
import {
	createTelemetrySession,
	createSessionStartEvent,
	createRenderEvent,
	createPropChangeEvent,
	createScoreEvent,
	createFrequencyEvent,
	createRecommendationEvent,
	endTelemetrySession,
	createSessionEndEvent,
} from '@sapanmozammel/render-telemetry-core';
import type { TelemetryEvent } from '@sapanmozammel/render-telemetry-core';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

type RenderSpec = {
	score: number;
	triggeredBy: 'props' | 'parent' | 'state';
	hasUnstableProps: boolean;
	unstablePropTypes: Array<'function' | 'object' | 'array'>;
	frequencyClass: 'LOW' | 'MODERATE' | 'HIGH';
};

const buildComponentEvents = (componentName: string, specs: readonly RenderSpec[]): TelemetryEvent[] => {
	const events: TelemetryEvent[] = [];
	let session = createTelemetrySession(componentName);

	const { event: startEv, session: s0 } = createSessionStartEvent(session);
	events.push(startEv);
	session = s0;

	for (let i = 0; i < specs.length; i++) {
		const spec = specs[i]!;
		const renderNumber = i + 1;

		const { event: renderEv, session: s1 } = createRenderEvent(session, {
			renderNumber,
			triggeredBy: spec.triggeredBy,
		});
		events.push(renderEv);
		session = s1;

		if (spec.hasUnstableProps) {
			const unstable = spec.unstablePropTypes.map((t, idx) => ({ name: `prop${idx}`, type: t }));
			const { event: propEv, session: s2 } = createPropChangeEvent(session, {
				renderNumber,
				changed: [],
				unstable,
				inferredTrigger: 'reference-instability',
				signalKind: 'reference-only',
			});
			events.push(propEv);
			session = s2;
		}

		const grade = spec.score >= 90 ? 'EXCELLENT' : spec.score >= 70 ? 'GOOD' : spec.score >= 50 ? 'MODERATE' : 'POOR';
		const { event: scoreEv, session: s3 } = createScoreEvent(session, {
			renderNumber,
			score: spec.score,
			grade,
			frequencyPenalty: spec.frequencyClass === 'HIGH' ? 25 : 0,
			instabilityPenalty: spec.hasUnstableProps ? 25 : 0,
			memoPenalty: 0,
			mixedSignalPenalty: 0,
			memoClassification: spec.hasUnstableProps ? 'INEFFECTIVE' : 'NOT_APPLICABLE',
			signalKind: spec.triggeredBy === 'parent' ? null : 'genuine',
		});
		events.push(scoreEv);
		session = s3;

		const { event: freqEv, session: s4 } = createFrequencyEvent(session, {
			renderNumber,
			windowMs: 5000,
			windowCount: renderNumber,
			rate: renderNumber / 5,
			classification: spec.frequencyClass,
			totalRenders: renderNumber,
		});
		events.push(freqEv);
		session = s4;

		if (spec.hasUnstableProps) {
			const { event: recEv, session: s5 } = createRecommendationEvent(session, {
				renderNumber,
				recommendations: ['Wrap unstable props with useCallback or useMemo at the call site.'],
			});
			events.push(recEv);
			session = s5;
		}
	}

	const ended = endTelemetrySession(session);
	const { event: endEv } = createSessionEndEvent(ended, { totalRenders: specs.length });
	events.push(endEv);

	return events;
};

const BAD_COMPONENT_SPECS: readonly RenderSpec[] = [
	{ score: 40, triggeredBy: 'parent', hasUnstableProps: true, unstablePropTypes: ['function', 'object'], frequencyClass: 'HIGH' },
	{ score: 35, triggeredBy: 'parent', hasUnstableProps: true, unstablePropTypes: ['function', 'object'], frequencyClass: 'HIGH' },
	{ score: 38, triggeredBy: 'parent', hasUnstableProps: true, unstablePropTypes: ['function', 'object'], frequencyClass: 'HIGH' },
	{ score: 30, triggeredBy: 'parent', hasUnstableProps: true, unstablePropTypes: ['function', 'object'], frequencyClass: 'HIGH' },
	{ score: 32, triggeredBy: 'parent', hasUnstableProps: true, unstablePropTypes: ['function', 'object'], frequencyClass: 'HIGH' },
	{ score: 28, triggeredBy: 'parent', hasUnstableProps: true, unstablePropTypes: ['function', 'object'], frequencyClass: 'HIGH' },
	{ score: 25, triggeredBy: 'parent', hasUnstableProps: true, unstablePropTypes: ['function', 'object'], frequencyClass: 'HIGH' },
	{ score: 22, triggeredBy: 'parent', hasUnstableProps: true, unstablePropTypes: ['function', 'object'], frequencyClass: 'HIGH' },
];

const MODERATE_COMPONENT_SPECS: readonly RenderSpec[] = [
	{ score: 65, triggeredBy: 'props', hasUnstableProps: false, unstablePropTypes: [], frequencyClass: 'MODERATE' },
	{ score: 70, triggeredBy: 'props', hasUnstableProps: false, unstablePropTypes: [], frequencyClass: 'MODERATE' },
	{ score: 60, triggeredBy: 'parent', hasUnstableProps: false, unstablePropTypes: [], frequencyClass: 'MODERATE' },
	{ score: 68, triggeredBy: 'props', hasUnstableProps: false, unstablePropTypes: [], frequencyClass: 'LOW' },
	{ score: 55, triggeredBy: 'parent', hasUnstableProps: false, unstablePropTypes: [], frequencyClass: 'LOW' },
];

const GOOD_COMPONENT_SPECS: readonly RenderSpec[] = [
	{ score: 90, triggeredBy: 'props', hasUnstableProps: false, unstablePropTypes: [], frequencyClass: 'LOW' },
	{ score: 88, triggeredBy: 'props', hasUnstableProps: false, unstablePropTypes: [], frequencyClass: 'LOW' },
	{ score: 92, triggeredBy: 'state', hasUnstableProps: false, unstablePropTypes: [], frequencyClass: 'LOW' },
];

const buildDemoEvents = (): TelemetryEvent[] => [
	...buildComponentEvents('ExpensiveList', BAD_COMPONENT_SPECS),
	...buildComponentEvents('DataPanel', MODERATE_COMPONENT_SPECS),
	...buildComponentEvents('Header', GOOD_COMPONENT_SPECS),
];

const BADGE_OK = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-ok bg-ok-dim';
const BADGE_WARN = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-warn bg-warn-dim';
const BADGE_NEUTRAL = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-muted bg-elevated';

const SEVERITY_COLORS: Record<string, string> = {
	CRITICAL: BADGE_WARN,
	HIGH: BADGE_NEUTRAL,
	MEDIUM: BADGE_NEUTRAL,
	LOW: BADGE_OK,
	INFO: BADGE_OK,
};

const gradeBadgeClass = (grade: string): string => {
	if (grade === 'EXCELLENT' || grade === 'GOOD') return BADGE_OK;
	if (grade === 'MODERATE') return BADGE_NEUTRAL;
	return BADGE_WARN;
};

const BottleneckRankingPanel = ({ report }: { report: IntelligenceReport }) => (
	<div className="flex flex-col gap-4">
		<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
			<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
				<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">
					Application Health — Score {report.applicationHealth.score} ({report.applicationHealth.grade})
				</span>
				<span className={gradeBadgeClass(report.applicationHealth.grade)}>
					{report.applicationHealth.healthyCount} healthy · {report.applicationHealth.degradedCount} degraded · {report.applicationHealth.criticalCount} critical
				</span>
			</div>
			<div className="p-4 text-xs min-h-50">
				{report.bottlenecks.map((b) => (
					<div key={b.componentName} className="border-b border-edge py-2.5 last:border-b-0">
						<div className="flex items-center justify-between mb-2">
							<span className="text-ink font-semibold">
								#{b.rank} — {b.componentName}
							</span>
							<span className="flex items-center gap-2">
								<span className={BADGE_WARN}>impact {b.impactScore}</span>
								<span className="text-dim text-[11px]">{b.category}</span>
							</span>
						</div>
						<div className="mb-1.5">
							<div className="flex gap-3 py-px">
								<span className="text-muted min-w-20 shrink-0" style={{ color: 'var(--text-muted)' }}>
									{b.description}
								</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	</div>
);

const RootCausePanel = ({ report }: { report: IntelligenceReport }) => (
	<div className="flex flex-col gap-4">
		<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
			<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
				<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">Root Causes ({report.rootCauses.length})</span>
			</div>
			<div className="p-4 text-xs min-h-50">
				{report.rootCauses.length === 0 ? (
					<div className="py-6 text-center text-dim text-xs flex flex-col gap-1">
						<span>No root causes detected above confidence threshold.</span>
					</div>
				) : (
					report.rootCauses.map((rc, i) => (
						<div key={i} className="border-b border-edge py-2.5 last:border-b-0">
							<div className="flex items-center justify-between mb-2">
								<span className="text-ink font-semibold">{rc.componentName}</span>
								<span className="flex items-center gap-2">
									<span className={BADGE_WARN}>{rc.kind}</span>
									<span className="text-dim text-[11px]">conf: {(rc.confidence * 100).toFixed(0)}%</span>
								</span>
							</div>
							<div className="mb-1.5">
								{rc.causalChain.map((step, j) => (
									<div key={j} className="flex gap-3 py-px">
										<span className="text-muted shrink-0" style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
											{j + 1}. {step}
										</span>
									</div>
								))}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	</div>
);

const RecommendationsPanel = ({ report }: { report: IntelligenceReport }) => (
	<div className="flex flex-col gap-4">
		<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
			<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
				<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">Recommendations ({report.recommendations.length})</span>
			</div>
			<div className="p-4 text-xs min-h-50">
				{report.recommendations.map((rec, i) => (
					<div key={i} className="border-b border-edge py-2.5 last:border-b-0">
						<div className="flex items-center justify-between mb-2">
							<span className="text-ink font-semibold">{rec.title}</span>
							<span className="flex items-center gap-2">
								<span className={SEVERITY_COLORS[rec.severity] ?? BADGE_NEUTRAL}>{rec.severity}</span>
								<span className="text-dim text-[11px]">{rec.componentName ?? 'app-level'}</span>
							</span>
						</div>
						<div className="mb-1.5">
							<div className="flex gap-3 py-px">
								<span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
									Fix: {rec.fix}
								</span>
							</div>
							<div className="flex gap-3 py-px">
								<span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
									Impact: {rec.expectedImpact}
								</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	</div>
);

const JsonExplorerPanel = ({ report }: { report: IntelligenceReport }) => {
	const [expanded, setExpanded] = useState<Record<string, boolean>>({
		applicationHealth: true,
	});

	const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

	type JsonSection = { key: string; label: string; value: unknown };

	const sections: JsonSection[] = [
		{ key: 'applicationHealth', label: 'applicationHealth', value: report.applicationHealth },
		{ key: 'components', label: `components (${report.components.length})`, value: report.components },
		{ key: 'bottlenecks', label: `bottlenecks (${report.bottlenecks.length})`, value: report.bottlenecks },
		{ key: 'rootCauses', label: `rootCauses (${report.rootCauses.length})`, value: report.rootCauses },
		{ key: 'correlations', label: `correlations (${report.correlations.length})`, value: report.correlations },
		{ key: 'recommendations', label: `recommendations (${report.recommendations.length})`, value: report.recommendations },
	];

	return (
		<div className="flex flex-col gap-4">
			<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
				<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
					<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">IntelligenceReport</span>
					<span className="text-dim text-[11px]">v{report.schemaVersion}</span>
				</div>
				<div className="p-4 text-xs min-h-50">
					{sections.map(({ key, label, value }) => (
						<div key={key} className="border-b border-edge py-2 last:border-b-0 cursor-pointer" onClick={() => toggle(key)}>
							<div className="flex items-center justify-between">
								<span className="text-ink font-semibold">
									{expanded[key] ? '▼' : '▶'} {label}
								</span>
							</div>
							{expanded[key] && (
								<pre className="mt-1 p-2 bg-elevated rounded text-[11px] overflow-x-auto text-muted leading-[1.6]">
									{JSON.stringify(value, null, 2)}
								</pre>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

type ScenarioTabsProps = {
	active: ScenarioId;
	onChange: (id: ScenarioId) => void;
};

const ScenarioTabs = ({ active, onChange }: ScenarioTabsProps) => (
	<div className="flex gap-1.5 flex-wrap mb-5" role="tablist">
		{SCENARIOS.map((s) => (
			<button
				key={s.id}
				role="tab"
				className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
					active === s.id
						? 'border-brand bg-brand-dim text-brand'
						: 'border-edge bg-raised text-muted hover:border-edge-active hover:text-ink'
				}`}
				aria-selected={active === s.id}
				onClick={() => onChange(s.id)}
			>
				<span className={s.badge === 'warn' ? 'text-warn' : 'text-ok'}>
					{s.badge === 'warn' ? '⚠' : '✓'}
				</span>
				{s.label}
			</button>
		))}
	</div>
);

const ScenarioPanel = ({ scenario, report }: { scenario: Scenario; report: IntelligenceReport }) => {
	if (scenario.id === 'bottleneck-ranking') return <BottleneckRankingPanel report={report} />;
	if (scenario.id === 'root-cause') return <RootCausePanel report={report} />;
	if (scenario.id === 'recommendations') return <RecommendationsPanel report={report} />;
	if (scenario.id === 'json-explorer') return <JsonExplorerPanel report={report} />;
	return null;
};

export const RenderIntelligenceDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('bottleneck-ranking');
	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	const report = useMemo(() => {
		const events = buildDemoEvents();
		return analyzeRenders({ type: 'events', events });
	}, []);

	return (
		<>
			<ScenarioTabs active={activeId} onChange={setActiveId} />

			<div className="mb-5 flex flex-col gap-2.5">
				<span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.75 rounded-full border w-fit ${
					activeScenario.badge === 'warn'
						? 'border-warn-dim bg-warn-dim text-warn'
						: 'border-ok-dim bg-ok-dim text-ok'
				}`}>
					{activeScenario.badge === 'warn' ? '⚠ issues detected' : '✓ clean output'}
				</span>
				<p className="text-[13px] text-muted max-w-150 leading-[1.7]">{activeScenario.description}</p>
			</div>

			<ScenarioPanel key={activeId} scenario={activeScenario} report={report} />

			<details className="border border-edge rounded-[10px] overflow-hidden group mt-2">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					How to use render-intelligence
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import { analyzeRenders } from '@sapanmozammel/render-intelligence';

// Feed any telemetry source into the analysis engine
const report = analyzeRenders({
  type: 'events',      // or 'snapshot' | 'replay'
  events: telemetryEvents,
});

// or: { type: 'snapshot', snapshot: telemetryBuffer.snapshot() }
// or: { type: 'replay', sessions: replaySessions }

// Application-level health
report.applicationHealth.score;       // 0-100
report.applicationHealth.grade;       // EXCELLENT | GOOD | MODERATE | POOR | CRITICAL
report.applicationHealth.criticalCount; // components below score 30

// Ranked bottlenecks (worst first)
report.bottlenecks[0].componentName;  // "ExpensiveList"
report.bottlenecks[0].category;       // "ineffective-memo"
report.bottlenecks[0].impactScore;    // 0-100

// Root cause causal chains
report.rootCauses[0].kind;            // "memo-defeat"
report.rootCauses[0].causalChain;     // step-by-step explanation
report.rootCauses[0].affectedComponents; // downstream components

// Deterministic recommendations
report.recommendations[0].id;        // "R-INTEL-MEMO-001"
report.recommendations[0].severity;  // "CRITICAL"
report.recommendations[0].fix;       // actionable string

// Options
analyzeRenders(source, {
  maxBottlenecks: 10,
  maxRecommendations: 20,
  confidenceThreshold: 0.3,
  correlationWindowMs: 16,
  includeWellOptimized: false,
  plugins: [myCustomPlugin],
});`}</pre>
					<p className="text-xs text-dim leading-[1.6]">
						Pure TypeScript, zero runtime dependencies. Works in Node.js, browsers, and edge runtimes. Accepts live telemetry events, buffered snapshots, or replay sessions interchangeably.
					</p>
				</div>
			</details>
		</>
	);
};
