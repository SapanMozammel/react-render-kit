'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRenderInsights } from '@sapanmozammel/render-insights';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

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

const formatTime = (d: Date): string => d.toTimeString().slice(0, 8);

const BADGE_OK = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-ok bg-ok-dim';
const BADGE_WARN = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-warn bg-warn-dim';

const gradeColor = (g: HealthGrade): string =>
	g === 'EXCELLENT' || g === 'GOOD' ? BADGE_OK : BADGE_WARN;

const SIGNAL_LABEL: Record<SignalKind, string> = {
	genuine: '✓ genuine',
	'reference-only': '⚠ reference-only',
	mixed: '⚡ mixed',
};

const SIGNAL_BADGE: Record<SignalKind, string> = {
	genuine: BADGE_OK,
	'reference-only': BADGE_WARN,
	mixed: BADGE_WARN,
};

const SESSION_LABEL: Record<MemoClassification, string> = {
	NOT_APPLICABLE: 'NOT_APPLICABLE',
	EFFECTIVE: 'EFFECTIVE',
	INEFFECTIVE: 'INEFFECTIVE',
	PARTIALLY_EFFECTIVE: 'PARTIALLY_EFFECTIVE',
};

const SESSION_BADGE: Record<MemoClassification, string> = {
	NOT_APPLICABLE: BADGE_OK,
	EFFECTIVE: BADGE_OK,
	INEFFECTIVE: BADGE_WARN,
	PARTIALLY_EFFECTIVE: BADGE_WARN,
};

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

const InsightsPanel = ({ entries, onClear }: { entries: InsightEntry[]; onClear: () => void }) => (
	<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
		<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
			<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">useRenderInsights output</span>
			{entries.length > 0 && (
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-transparent bg-transparent text-muted text-[11px] hover:text-ink hover:bg-raised cursor-pointer transition-colors"
					onClick={onClear}
				>
					clear
				</button>
			)}
		</div>
		<div className="p-4 text-xs min-h-50">
			{entries.length === 0 ? (
				<div className="py-6 text-center text-dim text-xs flex flex-col gap-1">
					<span>Trigger an action above.</span>
					<span className="text-[11px] opacity-70">No output = hook stayed silent.</span>
				</div>
			) : (
				entries.map((entry) => (
					<div key={entry.id} className="border-b border-edge py-2.5 last:border-b-0">
						<div className="flex items-center justify-between mb-2">
							<span className="text-ink font-semibold">[render-insights] &lt;Dashboard&gt;</span>
							<span className="flex items-center gap-2">
								<span className={gradeColor(entry.grade)}>
									{entry.score} / 100 · {entry.grade}
								</span>
								{entry.signalKind !== null && (
									<span className={SIGNAL_BADGE[entry.signalKind]}>
										{SIGNAL_LABEL[entry.signalKind]}
									</span>
								)}
								<span className={SESSION_BADGE[entry.sessionClass]}>
									{SESSION_LABEL[entry.sessionClass]}
								</span>
								<span className="text-dim text-[11px]">render #{entry.renderNumber}</span>
								<span className="text-dim text-[11px]">{formatTime(entry.at)}</span>
							</span>
						</div>
						{entry.changedKeys.length > 0 && (
							<div className="mb-1.5">
								<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">Changed Props</div>
								{entry.changedKeys.map((k) => (
									<div
										key={k}
										className={`flex gap-3 py-px pl-2 border-l-2 ${entry.unstableNames.includes(k) ? 'border-purple' : 'border-ok'}`}
									>
										<span className="text-muted min-w-20 shrink-0">{k}</span>
										<span className={entry.unstableNames.includes(k) ? 'text-warn break-all' : 'text-ok break-all'}>
											{entry.unstableNames.includes(k) ? 'new reference' : 'data changed'}
										</span>
									</div>
								))}
							</div>
						)}
						{entry.unstableNames.length > 0 && (
							<div className="mb-1.5">
								<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">Unstable Props</div>
								{entry.unstableNames.map((n) => (
									<div key={n} className="flex gap-3 py-px pl-2 border-l-2 border-purple">
										<span className="text-muted min-w-20 shrink-0">{n}</span>
										<span className="text-warn break-all">reference instability</span>
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

const DemoTarget = ({ onClick, onHover, onDismiss, config, tags, items, title, ignoreProps }: ScenarioCfg) => {
	const props: Record<string, unknown> = { onClick, onHover, onDismiss, config, tags, items, title };
	useRenderInsights('Dashboard', props, { ignoreProps });
	const renderCountRef = useRef(0);
	renderCountRef.current += 1;

	return (
		<div className="bg-elevated border border-edge rounded-md overflow-hidden mb-4">
			<div className="text-[11px] text-dim px-3 py-1.5 border-b border-edge bg-raised flex items-center justify-between">
				&lt;Dashboard&gt;
				<span className="inline-flex items-center gap-1 text-[11px] text-dim px-2 py-0.5 rounded-full border border-edge bg-elevated ml-2" suppressHydrationWarning>
					render #{renderCountRef.current}
				</span>
			</div>
			<div className="p-3">
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">onClick</span>
					<span className="text-brand break-all">[Function]</span>
				</div>
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">config</span>
					<span className="text-purple break-all">
						{'{'}theme:&quot;{config.theme}&quot;{config.density ? `, density:"${config.density}"` : ''}{'}'}
					</span>
				</div>
				{tags && (
					<div className="flex gap-3 py-0.75 text-[13px]">
						<span className="text-muted min-w-20 shrink-0">tags</span>
						<span className="text-purple break-all">[{tags.join(', ')}]</span>
					</div>
				)}
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">title</span>
					<span className="text-ink break-all">&quot;{title}&quot;</span>
				</div>
			</div>
		</div>
	);
};

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
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-5 items-start max-md:grid-cols-1">
				<DemoTarget {...cfg} />
				<InsightsPanel entries={entries} onClear={clear} />
			</div>

			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand-dim bg-brand-dim text-brand text-xs hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={handleTrigger}
				>
					{scenario.triggerLabel}
				</button>
			</div>

			<details className="border border-edge rounded-[10px] overflow-hidden group">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					See the code
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					{scenario.canFix && (
						<div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-error">❌ The pattern:</div>
					)}
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{scenario.codeBreaking}</pre>
					{scenario.canFix && scenario.codeFixed && (
						<>
							<div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ok">✅ The fix:</div>
							<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{scenario.codeFixed}</pre>
						</>
					)}
				</div>
			</details>
		</div>
	);
};

export const RenderInsightsDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('perfectly-optimized');
	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	return (
		<>
			<ScenarioTabs active={activeId} onChange={setActiveId} />

			<div className="mb-5 flex flex-col gap-2.5">
				<span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.75 rounded-full border w-fit ${
					activeScenario.badge === 'warn'
						? 'border-warn-dim bg-warn-dim text-warn'
						: 'border-ok-dim bg-ok-dim text-ok'
				}`}>
					{activeScenario.badge === 'warn' ? '⚠ health issues' : '✓ healthy'}
				</span>
				<p className="text-[13px] text-muted max-w-150 leading-[1.7]">{activeScenario.description}</p>
			</div>

			<ScenarioInner key={activeId} scenario={activeScenario} />

			<details className="border border-edge rounded-[10px] overflow-hidden group mt-2">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					How to add this to your component
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import { useRenderInsights } from '@sapanmozammel/render-insights';

const Dashboard = React.memo((props: DashboardProps) => {
  useRenderInsights('Dashboard', props as Record<string, unknown>);
  // rest of your component...
});`}</pre>
					<p className="text-xs text-dim leading-[1.6]">
						No-op in production. Open DevTools console to see the grouped report alongside this
						panel. Correlates prop changes, frequency, memo effectiveness, score, and
						recommendations in a single report.
					</p>
				</div>
			</details>
		</>
	);
};
