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

// ── Synthetic event builder ────────────────────────────────────────────────────

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

// ── Severity badge ─────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
	CRITICAL: 'console-entry__badge--warn',
	HIGH: 'console-entry__badge--neutral',
	MEDIUM: 'console-entry__badge--neutral',
	LOW: 'console-entry__badge--ok',
	INFO: 'console-entry__badge--ok',
};

const gradeBadgeClass = (grade: string): string => {
	if (grade === 'EXCELLENT' || grade === 'GOOD') return 'console-entry__badge--ok';
	if (grade === 'MODERATE') return 'console-entry__badge--neutral';
	return 'console-entry__badge--warn';
};

// ── Scenario panels ────────────────────────────────────────────────────────────

const BottleneckRankingPanel = ({ report }: { report: IntelligenceReport }) => (
	<div className="scenario-body">
		<div className="demo-pane">
			<div className="demo-pane__header">
				<span className="demo-pane__title">
					Application Health — Score {report.applicationHealth.score} ({report.applicationHealth.grade})
				</span>
				<span className={`console-entry__badge ${gradeBadgeClass(report.applicationHealth.grade)}`}>
					{report.applicationHealth.healthyCount} healthy · {report.applicationHealth.degradedCount} degraded · {report.applicationHealth.criticalCount} critical
				</span>
			</div>
			<div className="demo-pane__body console-panel">
				{report.bottlenecks.map((b) => (
					<div key={b.componentName} className="console-entry">
						<div className="console-entry__header">
							<span className="console-entry__title">
								#{b.rank} — {b.componentName}
							</span>
							<span className="console-entry__meta">
								<span className="console-entry__badge console-entry__badge--warn">
									impact {b.impactScore}
								</span>
								<span className="console-entry__render">{b.category}</span>
							</span>
						</div>
						<div className="console-section">
							<div className="console-section__line">
								<span className="console-line__key" style={{ color: 'var(--text-muted)' }}>
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
	<div className="scenario-body">
		<div className="demo-pane">
			<div className="demo-pane__header">
				<span className="demo-pane__title">Root Causes ({report.rootCauses.length})</span>
			</div>
			<div className="demo-pane__body console-panel">
				{report.rootCauses.length === 0 ? (
					<div className="console-panel__empty">
						<span>No root causes detected above confidence threshold.</span>
					</div>
				) : (
					report.rootCauses.map((rc, i) => (
						<div key={i} className="console-entry">
							<div className="console-entry__header">
								<span className="console-entry__title">{rc.componentName}</span>
								<span className="console-entry__meta">
									<span className="console-entry__badge console-entry__badge--warn">{rc.kind}</span>
									<span className="console-entry__render">conf: {(rc.confidence * 100).toFixed(0)}%</span>
								</span>
							</div>
							<div className="console-section">
								{rc.causalChain.map((step, j) => (
									<div key={j} className="console-section__line">
										<span className="console-line__key" style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
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
	<div className="scenario-body">
		<div className="demo-pane">
			<div className="demo-pane__header">
				<span className="demo-pane__title">Recommendations ({report.recommendations.length})</span>
			</div>
			<div className="demo-pane__body console-panel">
				{report.recommendations.map((rec, i) => (
					<div key={i} className="console-entry">
						<div className="console-entry__header">
							<span className="console-entry__title">{rec.title}</span>
							<span className="console-entry__meta">
								<span className={`console-entry__badge ${SEVERITY_COLORS[rec.severity] ?? ''}`}>
									{rec.severity}
								</span>
								<span className="console-entry__render">
									{rec.componentName ?? 'app-level'}
								</span>
							</span>
						</div>
						<div className="console-section">
							<div className="console-section__line">
								<span className="console-line__key" style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
									Fix: {rec.fix}
								</span>
							</div>
							<div className="console-section__line">
								<span className="console-line__key" style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
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

	const toggle = (key: string) =>
		setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

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
		<div className="scenario-body">
			<div className="demo-pane">
				<div className="demo-pane__header">
					<span className="demo-pane__title">IntelligenceReport</span>
					<span className="console-entry__render" style={{ fontSize: '0.8em' }}>
						v{report.schemaVersion}
					</span>
				</div>
				<div className="demo-pane__body console-panel">
					{sections.map(({ key, label, value }) => (
						<div key={key} className="console-entry" style={{ cursor: 'pointer' }} onClick={() => toggle(key)}>
							<div className="console-entry__header">
								<span className="console-entry__title">{expanded[key] ? '▼' : '▶'} {label}</span>
							</div>
							{expanded[key] && (
								<pre
									style={{
										margin: '4px 0 0',
										padding: '8px',
										background: 'var(--surface-raised)',
										borderRadius: 4,
										fontSize: '0.75em',
										overflowX: 'auto',
										color: 'var(--text-muted)',
									}}
								>
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

// ── Scenario tabs ──────────────────────────────────────────────────────────────

type ScenarioTabsProps = {
	active: ScenarioId;
	onChange: (id: ScenarioId) => void;
};

const ScenarioTabs = ({ active, onChange }: ScenarioTabsProps) => (
	<div className="scenario-tabs" role="tablist">
		{SCENARIOS.map((s) => (
			<button
				key={s.id}
				role="tab"
				className={`scenario-tab scenario-tab--${s.badge}`}
				aria-selected={active === s.id}
				onClick={() => onChange(s.id)}
			>
				<span className={`scenario-tab__indicator scenario-tab__indicator--${s.badge}`}>
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

// ── Root export ────────────────────────────────────────────────────────────────

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

			<div className="scenario-header">
				<span className={`scenario-badge scenario-badge--${activeScenario.badge}`}>
					{activeScenario.badge === 'warn' ? '⚠ issues detected' : '✓ clean output'}
				</span>
				<p className="scenario-description">{activeScenario.description}</p>
			</div>

			<ScenarioPanel key={activeId} scenario={activeScenario} report={report} />

			<details className="code-hint code-hint--usage">
				<summary>How to use render-intelligence</summary>
				<div className="code-hint__body">
					<pre className="code-hint__pre">{`import { analyzeRenders } from '@sapanmozammel/render-intelligence';

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
					<p className="code-hint__note">
						Pure TypeScript, zero runtime dependencies. Works in Node.js, browsers, and edge runtimes.
						Accepts live telemetry events, buffered snapshots, or replay sessions interchangeably.
					</p>
				</div>
			</details>
		</>
	);
};
