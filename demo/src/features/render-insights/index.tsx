'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRenderInsights } from '@sapanmozammel/render-insights';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

// ── Types ──────────────────────────────────────────────────────

type DashboardProps = {
	onClick: () => void;
	onHover?: () => void;
	onDismiss?: () => void;
	config: { theme: string; density?: string };
	tags?: string[];
	items?: string[];
	title: string;
};

type HealthGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
type FrequencyClass = 'NOT_ENOUGH_DATA' | 'LOW' | 'MODERATE' | 'HIGH';
type SignalKind = 'genuine' | 'reference-only' | 'mixed';
type MemoClassification = 'NOT_APPLICABLE' | 'EFFECTIVE' | 'INEFFECTIVE' | 'PARTIALLY_EFFECTIVE';

type InsightEntry = {
	id: string;
	at: Date;
	renderNumber: number;
	score: number;
	grade: HealthGrade;
	signalKind: SignalKind | null;
	sessionClass: MemoClassification;
	frequencyClass: FrequencyClass;
	changedKeys: string[];
	unstableNames: string[];
	recommendations: string[];
};

type ScenarioCfg = DashboardProps & { ignoreProps: string[] };

// ── Helpers ────────────────────────────────────────────────────

const formatTime = (d: Date): string => d.toTimeString().slice(0, 8);

const gradeColor = (g: HealthGrade): string => {
	if (g === 'EXCELLENT') return 'console-entry__badge--ok';
	if (g === 'GOOD') return 'console-entry__badge--ok';
	return 'console-entry__badge--warn';
};

// ── Capture hook (mirrors aggregator logic for the visual panel) ─

const isRefType = (v: unknown): boolean =>
	typeof v === 'function' || Array.isArray(v) || (typeof v === 'object' && v !== null);

const useInsightsCapture = (
	props: Record<string, unknown>,
	options: { ignoreProps: string[]; frequencyWindowMs?: number },
) => {
	const { ignoreProps, frequencyWindowMs = 10000 } = options;
	const prevRef = useRef<Record<string, unknown> | null>(null);
	const renderCountRef = useRef(0);
	const timestampsRef = useRef<number[]>([]);
	const signalWindowRef = useRef<SignalKind[]>([]);
	const pendingRef = useRef<InsightEntry | null>(null);
	const [entries, setEntries] = useState<InsightEntry[]>([]);

	renderCountRef.current += 1;
	const now = Date.now();
	timestampsRef.current.push(now);
	const windowStart = now - frequencyWindowMs;
	while (timestampsRef.current.length > 0 && timestampsRef.current[0]! < windowStart) {
		timestampsRef.current.shift();
	}

	const windowCount = timestampsRef.current.length;
	const rate = windowCount >= 2 ? ((windowCount - 1) / frequencyWindowMs) * 1000 : 0;
	const frequencyClass: FrequencyClass =
		windowCount < 2 ? 'NOT_ENOUGH_DATA' : rate >= 5 ? 'HIGH' : rate >= 2 ? 'MODERATE' : 'LOW';

	const computeSession = (w: readonly SignalKind[]): MemoClassification => {
		if (w.length === 0) return 'NOT_APPLICABLE';
		const kinds = new Set(w);
		if (kinds.size === 1 && kinds.has('genuine')) return 'EFFECTIVE';
		if (kinds.size === 1 && kinds.has('reference-only')) return 'INEFFECTIVE';
		return 'PARTIALLY_EFFECTIVE';
	};

	const computeScore = (
		freq: FrequencyClass,
		unstableCount: number,
		session: MemoClassification,
		mixedCount: number,
	): number => {
		const fp = freq === 'LOW' ? 0 : freq === 'MODERATE' ? 10 : 25;
		const up = Math.min(unstableCount * 8, 30);
		const mp =
			session === 'NOT_APPLICABLE' || session === 'EFFECTIVE'
				? 0
				: session === 'PARTIALLY_EFFECTIVE'
					? 15
					: 30;
		const msp = Math.min(mixedCount * 3, 15);
		return Math.max(0, Math.min(100, 100 - fp - up - mp - msp));
	};

	const gradeFromScore = (s: number): HealthGrade =>
		s >= 90 ? 'EXCELLENT' : s >= 70 ? 'GOOD' : s >= 50 ? 'FAIR' : 'POOR';

	if (prevRef.current === null) {
		prevRef.current = props;
	} else {
		const prev = prevRef.current;
		const allKeys = [...new Set([...Object.keys(prev), ...Object.keys(props)])];
		const changedKeys = allKeys.filter((k) => !ignoreProps.includes(k) && !Object.is(prev[k], props[k]));

		if (changedKeys.length > 0) {
			let hasGenuine = false;
			let hasReference = false;
			for (const key of changedKeys) {
				if (!(key in prev) || !(key in props)) hasGenuine = true;
				else if (isRefType(props[key])) hasReference = true;
				else hasGenuine = true;
			}
			const kind: SignalKind = hasGenuine && hasReference ? 'mixed' : hasGenuine ? 'genuine' : 'reference-only';
			const w = signalWindowRef.current;
			if (w.length === 20) w.shift();
			w.push(kind);

			const unstableNames = changedKeys
				.filter((k) => k in prev && k in props && isRefType(props[k]))
				.map((k) => k);
			const session = computeSession(signalWindowRef.current);
			const mixedCount = signalWindowRef.current.filter((s) => s === 'mixed').length;
			const score = computeScore(frequencyClass, unstableNames.length, session, mixedCount);

			pendingRef.current = {
				id: crypto.randomUUID(),
				at: new Date(),
				renderNumber: renderCountRef.current,
				score,
				grade: gradeFromScore(score),
				signalKind: kind,
				sessionClass: session,
				frequencyClass,
				changedKeys,
				unstableNames,
				recommendations: [],
			};
		} else {
			pendingRef.current = null;
		}
		prevRef.current = props;
	}

	useEffect(() => {
		if (pendingRef.current !== null) {
			const entry = pendingRef.current;
			setEntries((prev) => [entry, ...prev].slice(0, 30));
			pendingRef.current = null;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props]);

	const clear = useCallback(() => setEntries([]), []);
	return { entries, clear };
};

// ── ScenarioTabs ───────────────────────────────────────────────

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

// ── InsightsPanel ──────────────────────────────────────────────

const SIGNAL_LABEL: Record<SignalKind, string> = {
	genuine: '✓ genuine',
	'reference-only': '⚠ reference-only',
	mixed: '⚡ mixed',
};

const SIGNAL_BADGE: Record<SignalKind, string> = {
	genuine: 'console-entry__badge--ok',
	'reference-only': 'console-entry__badge--warn',
	mixed: 'console-entry__badge--warn',
};

const SESSION_LABEL: Record<MemoClassification, string> = {
	NOT_APPLICABLE: 'NOT_APPLICABLE',
	EFFECTIVE: 'EFFECTIVE',
	INEFFECTIVE: 'INEFFECTIVE',
	PARTIALLY_EFFECTIVE: 'PARTIALLY_EFFECTIVE',
};

const SESSION_BADGE: Record<MemoClassification, string> = {
	NOT_APPLICABLE: 'console-entry__badge--ok',
	EFFECTIVE: 'console-entry__badge--ok',
	INEFFECTIVE: 'console-entry__badge--warn',
	PARTIALLY_EFFECTIVE: 'console-entry__badge--warn',
};

const InsightsPanel = ({ entries, onClear }: { entries: InsightEntry[]; onClear: () => void }) => (
	<div className="demo-pane">
		<div className="demo-pane__header">
			<span className="demo-pane__title">useRenderInsights output</span>
			{entries.length > 0 && (
				<button className="btn btn--ghost btn--sm" onClick={onClear}>
					clear
				</button>
			)}
		</div>
		<div className="demo-pane__body console-panel">
			{entries.length === 0 ? (
				<div className="console-panel__empty">
					<span>Trigger an action above.</span>
					<span className="console-panel__empty-hint">No output = hook stayed silent.</span>
				</div>
			) : (
				entries.map((entry) => (
					<div key={entry.id} className="console-entry">
						<div className="console-entry__header">
							<span className="console-entry__title">[render-insights] &lt;Dashboard&gt;</span>
							<span className="console-entry__meta">
								<span className={`console-entry__badge ${gradeColor(entry.grade)}`}>
									{entry.score} / 100 · {entry.grade}
								</span>
								{entry.signalKind !== null && (
									<span className={`console-entry__badge ${SIGNAL_BADGE[entry.signalKind]}`}>
										{SIGNAL_LABEL[entry.signalKind]}
									</span>
								)}
								<span className={`console-entry__badge ${SESSION_BADGE[entry.sessionClass]}`}>
									{SESSION_LABEL[entry.sessionClass]}
								</span>
								<span className="console-entry__render">render #{entry.renderNumber}</span>
								<span className="console-entry__time">{formatTime(entry.at)}</span>
							</span>
						</div>
						{entry.changedKeys.length > 0 && (
							<div className="console-section">
								<div className="console-section__label">Changed Props</div>
								{entry.changedKeys.map((k) => (
									<div
										key={k}
										className={`console-section__line ${entry.unstableNames.includes(k) ? 'console-section__line--reference' : 'console-section__line--added'}`}
									>
										<span className="console-line__key">{k}</span>
										<span className={entry.unstableNames.includes(k) ? 'console-line__ref' : 'console-line__added'}>
											{entry.unstableNames.includes(k) ? 'new reference' : 'data changed'}
										</span>
									</div>
								))}
							</div>
						)}
						{entry.unstableNames.length > 0 && (
							<div className="console-section">
								<div className="console-section__label">Unstable Props</div>
								{entry.unstableNames.map((n) => (
									<div key={n} className="console-section__line console-section__line--reference">
										<span className="console-line__key">{n}</span>
										<span className="console-line__ref">reference instability</span>
									</div>
								))}
							</div>
						)}
					</div>
				))
			)}
		</div>
	</div>
);

// ── DemoTarget ─────────────────────────────────────────────────

const DemoTarget = ({ onClick, onHover, onDismiss, config, tags, items, title, ignoreProps }: ScenarioCfg) => {
	const props: Record<string, unknown> = { onClick, onHover, onDismiss, config, tags, items, title };
	useRenderInsights('Dashboard', props, { ignoreProps });
	const renderCountRef = useRef(0);
	renderCountRef.current += 1;

	return (
		<div className="component-preview">
			<div className="component-preview__label">
				&lt;Dashboard&gt;
				<span className="render-badge" suppressHydrationWarning>
					render #{renderCountRef.current}
				</span>
			</div>
			<div className="component-preview__body">
				<div className="prop-row">
					<span className="prop-row__key">onClick</span>
					<span className="prop-row__value prop-row__value--function">[Function]</span>
				</div>
				<div className="prop-row">
					<span className="prop-row__key">config</span>
					<span className="prop-row__value prop-row__value--object">
						{'{'}theme:&quot;{config.theme}&quot;{config.density ? `, density:"${config.density}"` : ''}{'}'}
					</span>
				</div>
				{tags && (
					<div className="prop-row">
						<span className="prop-row__key">tags</span>
						<span className="prop-row__value prop-row__value--object">[{tags.join(', ')}]</span>
					</div>
				)}
				<div className="prop-row">
					<span className="prop-row__key">title</span>
					<span className="prop-row__value">&quot;{title}&quot;</span>
				</div>
			</div>
		</div>
	);
};

// ── ScenarioInner ──────────────────────────────────────────────

const ScenarioInner = ({ scenario }: { scenario: Scenario }) => {
	const [parentTick, setParentTick] = useState(0);
	const [dataTick, setDataTick] = useState(0);

	const stableOnClick = useCallback(() => {}, []);
	const stableOnHover = useCallback(() => {}, []);
	const stableOnDismiss = useCallback(() => {}, []);
	const stableConfig = useMemo<{ theme: string; density?: string }>(() => ({ theme: 'dark' }), []);
	const stableTags = useMemo<string[]>(() => ['admin', 'power-user'], []);
	const stableItems = useMemo<string[]>(() => ['revenue', 'users', 'churn'], []);

	const unstableOnClick = useCallback(() => {}, [parentTick]);
	const unstableOnHover = useCallback(() => {}, [parentTick]);
	const unstableOnDismiss = useCallback(() => {}, [parentTick]);
	const unstableConfig = useMemo<{ theme: string; density?: string }>(
		() => ({ theme: 'dark', density: parentTick % 2 ? 'compact' : 'default' }),
		[parentTick],
	);
	const unstableTags = useMemo<string[]>(() => ['admin', 'power-user'], [parentTick]);

	const title = String(dataTick);

	const cfg = useMemo<ScenarioCfg>(() => {
		if (scenario.id === 'perfectly-optimized')
			return { onClick: stableOnClick, config: stableConfig, tags: stableTags, title, ignoreProps: [] };
		if (scenario.id === 'inline-callback-hell')
			return {
				onClick: unstableOnClick,
				onHover: unstableOnHover,
				onDismiss: unstableOnDismiss,
				config: stableConfig,
				title: 'Dashboard',
				ignoreProps: [],
			};
		if (scenario.id === 'inline-object-instability')
			return { onClick: stableOnClick, config: unstableConfig, items: stableItems, title: 'Dashboard', ignoreProps: [] };
		if (scenario.id === 'memo-defeated')
			return { onClick: unstableOnClick, config: unstableConfig, tags: unstableTags, title: 'Dashboard', ignoreProps: [] };
		if (scenario.id === 'partial-memo')
			return { onClick: unstableOnClick, config: stableConfig, title, ignoreProps: [] };
		if (scenario.id === 'high-frequency')
			return { onClick: stableOnClick, config: stableConfig, title, ignoreProps: [] };
		// deep-cascade
		return { onClick: unstableOnClick, config: unstableConfig, title, ignoreProps: [] };
	}, [
		scenario.id,
		stableOnClick, stableOnHover, stableOnDismiss, stableConfig, stableTags, stableItems,
		unstableOnClick, unstableOnHover, unstableOnDismiss, unstableConfig, unstableTags,
		title,
	]);

	const captureProps = useMemo<Record<string, unknown>>(
		() => ({
			onClick: cfg.onClick,
			onHover: cfg.onHover,
			onDismiss: cfg.onDismiss,
			config: cfg.config,
			tags: cfg.tags,
			items: cfg.items,
			title: cfg.title,
		}),
		[cfg.onClick, cfg.onHover, cfg.onDismiss, cfg.config, cfg.tags, cfg.items, cfg.title],
	);

	const { entries, clear } = useInsightsCapture(captureProps, { ignoreProps: cfg.ignoreProps });

	const handleTrigger = useCallback(() => {
		if (scenario.id === 'high-frequency') {
			// fire 8 rapid increments to push frequency to HIGH
			for (let i = 0; i < 8; i++) {
				setTimeout(() => setDataTick((t) => t + 1), i * 40);
			}
		} else if (scenario.triggerBothTicks) {
			setParentTick((t) => t + 1);
			setDataTick((t) => t + 1);
		} else if (
			scenario.id === 'inline-callback-hell' ||
			scenario.id === 'inline-object-instability' ||
			scenario.id === 'memo-defeated'
		) {
			setParentTick((t) => t + 1);
		} else {
			setDataTick((t) => t + 1);
		}
	}, [scenario.id, scenario.triggerBothTicks]);

	return (
		<div className="scenario-body">
			<div className="demo-grid">
				<DemoTarget {...cfg} />
				<InsightsPanel entries={entries} onClear={clear} />
			</div>

			<div className="scenario-controls">
				<button className="btn btn--primary" onClick={handleTrigger}>
					{scenario.triggerLabel}
				</button>
			</div>

			<details className="code-hint">
				<summary>See the code</summary>
				<div className="code-hint__body">
					{scenario.canFix && (
						<div className="code-hint__label code-hint__label--bad">❌ The pattern:</div>
					)}
					<pre className="code-hint__pre">{scenario.codeBreaking}</pre>
					{scenario.canFix && scenario.codeFixed && (
						<>
							<div className="code-hint__label code-hint__label--good">✅ The fix:</div>
							<pre className="code-hint__pre">{scenario.codeFixed}</pre>
						</>
					)}
				</div>
			</details>
		</div>
	);
};

// ── RenderInsightsDemo ─────────────────────────────────────────

export const RenderInsightsDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('perfectly-optimized');
	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	return (
		<>
			<ScenarioTabs active={activeId} onChange={setActiveId} />

			<div className="scenario-header">
				<span className={`scenario-badge scenario-badge--${activeScenario.badge}`}>
					{activeScenario.badge === 'warn' ? '⚠ health issues' : '✓ healthy'}
				</span>
				<p className="scenario-description">{activeScenario.description}</p>
			</div>

			<ScenarioInner key={activeId} scenario={activeScenario} />

			<details className="code-hint code-hint--usage">
				<summary>How to add this to your component</summary>
				<div className="code-hint__body">
					<pre className="code-hint__pre">{`import { useRenderInsights } from '@sapanmozammel/render-insights';

const Dashboard = React.memo((props: DashboardProps) => {
  useRenderInsights('Dashboard', props as Record<string, unknown>);
  // rest of your component...
});`}</pre>
					<p className="code-hint__note">
						No-op in production. Open DevTools console to see the grouped report alongside this
						panel. Correlates prop changes, frequency, memo effectiveness, score, and
						recommendations in a single report.
					</p>
				</div>
			</details>
		</>
	);
};
