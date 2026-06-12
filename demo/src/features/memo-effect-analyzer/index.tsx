'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMemoEffectAnalyzer } from '@sapanmozammel/memo-effect-analyzer';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

type CardProps = {
	onAction: () => void;
	config: { theme: string };
	tags: string[];
	label: string;
};

type PropInstabilityKind = 'function' | 'array' | 'object';
type SignalKind = 'genuine' | 'reference-only' | 'mixed';
type MemoClassification = 'NOT_APPLICABLE' | 'EFFECTIVE' | 'INEFFECTIVE' | 'PARTIALLY_EFFECTIVE';

type CaptureEntry = {
	id: string;
	at: Date;
	renderNumber: number;
	kind: SignalKind | null;
	sessionClass: MemoClassification;
	genuineKeys: string[];
	unstableProps: Array<{ name: string; type: PropInstabilityKind }>;
};

type ScenarioCfg = CardProps & {
	ignoreProps: string[];
	logOnEveryRender: boolean;
};

const isRefType = (v: unknown): boolean => {
	if (typeof v === 'function') return true;
	if (Array.isArray(v)) return true;
	if (typeof v === 'object' && v !== null) return true;
	return false;
};

const getRefKind = (v: unknown): PropInstabilityKind => {
	if (typeof v === 'function') return 'function';
	if (Array.isArray(v)) return 'array';
	return 'object';
};

const formatTime = (d: Date): string => d.toTimeString().slice(0, 8);

const BADGE_OK = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-ok bg-ok-dim';
const BADGE_WARN = 'text-[10px] font-semibold px-1.5 py-px rounded-full text-warn bg-warn-dim';

const KIND_BADGE: Record<SignalKind, string> = {
	genuine: BADGE_OK,
	'reference-only': BADGE_WARN,
	mixed: BADGE_WARN,
};

const KIND_LABEL: Record<SignalKind, string> = {
	genuine: '✓ genuine',
	'reference-only': '⚠ reference-only',
	mixed: '⚡ mixed',
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

const useMemoCapture = (
	props: Record<string, unknown>,
	options: { ignoreProps: string[] },
) => {
	const { ignoreProps } = options;
	const prevRef = useRef<Record<string, unknown> | null>(null);
	const renderNumberRef = useRef(0);
	const signalWindowRef = useRef<SignalKind[]>([]);
	const pendingRef = useRef<CaptureEntry | null>(null);
	const [entries, setEntries] = useState<CaptureEntry[]>([]);

	renderNumberRef.current += 1;

	const computeSession = (window: readonly SignalKind[]): MemoClassification => {
		if (window.length === 0) return 'NOT_APPLICABLE';
		const kinds = new Set(window);
		if (kinds.size === 1 && kinds.has('genuine')) return 'EFFECTIVE';
		if (kinds.size === 1 && kinds.has('reference-only')) return 'INEFFECTIVE';
		return 'PARTIALLY_EFFECTIVE';
	};

	if (prevRef.current === null) {
		prevRef.current = props;
	} else {
		const prev = prevRef.current;
		const allKeys = [...new Set([...Object.keys(prev), ...Object.keys(props)])];
		const changedKeys = allKeys.filter(
			(k) => !ignoreProps.includes(k) && !Object.is(prev[k], props[k]),
		);

		if (changedKeys.length > 0) {
			let hasGenuine = false;
			let hasReference = false;

			for (const key of changedKeys) {
				if (!(key in prev) || !(key in props)) {
					hasGenuine = true;
				} else if (isRefType(props[key])) {
					hasReference = true;
				} else {
					hasGenuine = true;
				}
			}

			const kind: SignalKind =
				hasGenuine && hasReference ? 'mixed' : hasGenuine ? 'genuine' : 'reference-only';

			const w = signalWindowRef.current;
			if (w.length === 20) w.shift();
			w.push(kind);

			const genuineKeys = changedKeys.filter((k) => {
				if (!(k in prev) || !(k in props)) return true;
				return !isRefType(props[k]);
			});
			const unstableProps = changedKeys
				.filter((k) => k in prev && k in props && isRefType(props[k]))
				.map((k) => ({ name: k, type: getRefKind(props[k]) }));

			pendingRef.current = {
				id: crypto.randomUUID(),
				at: new Date(),
				renderNumber: renderNumberRef.current,
				kind,
				sessionClass: computeSession(signalWindowRef.current),
				genuineKeys,
				unstableProps,
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

const ClassificationPanel = ({
	entries,
	onClear,
}: {
	entries: CaptureEntry[];
	onClear: () => void;
}) => (
	<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
		<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
			<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">useMemoEffectAnalyzer output</span>
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
							<span className="text-ink font-semibold">
								[memo-effect-analyzer] &lt;UserCard&gt;
							</span>
							<span className="flex items-center gap-2">
								{entry.kind !== null && (
									<span className={KIND_BADGE[entry.kind]}>{KIND_LABEL[entry.kind]}</span>
								)}
								<span className={SESSION_BADGE[entry.sessionClass]}>
									{SESSION_LABEL[entry.sessionClass]}
								</span>
								<span className="text-dim text-[11px]">render #{entry.renderNumber}</span>
								<span className="text-dim text-[11px]">{formatTime(entry.at)}</span>
							</span>
						</div>
						{entry.genuineKeys.length > 0 && (
							<div className="mb-1.5">
								<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">Genuine Changes</div>
								{entry.genuineKeys.map((k) => (
									<div key={k} className="flex gap-3 py-px pl-2 border-l-2 border-ok">
										<span className="text-muted min-w-20 shrink-0">{k}</span>
										<span className="text-ok break-all">data changed</span>
									</div>
								))}
							</div>
						)}
						{entry.unstableProps.length > 0 && (
							<div className="mb-1.5">
								<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">Reference Instability</div>
								{entry.unstableProps.map((p) => (
									<div key={p.name} className="flex gap-3 py-px pl-2 border-l-2 border-purple">
										<span className="text-muted min-w-20 shrink-0">{p.name}</span>
										<span className="text-warn break-all">{p.type} · new reference</span>
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

type DemoTargetProps = ScenarioCfg;

const DemoTarget = ({ onAction, config, tags, label, ignoreProps, logOnEveryRender }: DemoTargetProps) => {
	const props: Record<string, unknown> = { onAction, config, tags, label };
	useMemoEffectAnalyzer('UserCard', props, { ignoreProps, logOnEveryRender });
	const renderCountRef = useRef(0);
	renderCountRef.current += 1;

	return (
		<div className="bg-elevated border border-edge rounded-md overflow-hidden mb-4">
			<div className="text-[11px] text-dim px-3 py-1.5 border-b border-edge bg-raised flex items-center justify-between">
				&lt;UserCard&gt;
				<span className="inline-flex items-center gap-1 text-[11px] text-dim px-2 py-0.5 rounded-full border border-edge bg-elevated ml-2" suppressHydrationWarning>
					render #{renderCountRef.current}
				</span>
			</div>
			<div className="p-3">
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">onAction</span>
					<span className="text-brand break-all">[Function]</span>
				</div>
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">config</span>
					<span className="text-purple break-all">{'{'}theme:&quot;{config.theme}&quot;{'}'}</span>
				</div>
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">tags</span>
					<span className="text-purple break-all">[{tags.join(', ')}]</span>
				</div>
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">label</span>
					<span className="text-ink break-all">&quot;{label}&quot;</span>
				</div>
			</div>
		</div>
	);
};

const ScenarioInner = ({ scenario }: { scenario: Scenario }) => {
	const [parentTick, setParentTick] = useState(0);
	const [dataTick, setDataTick] = useState(0);

	const stableOnAction = useCallback(() => {}, []);
	const stableConfig = useMemo<{ theme: string }>(() => ({ theme: 'dark' }), []);
	const stableTags = useMemo<string[]>(() => ['admin'], []);

	const unstableOnAction = useCallback(() => {}, [parentTick]);
	const unstableConfig = useMemo<{ theme: string }>(() => ({ theme: 'dark' }), [parentTick]);
	const unstableTags = useMemo<string[]>(() => ['admin'], [parentTick]);

	const label = String(dataTick);

	const cfg = useMemo<ScenarioCfg>(() => {
		if (scenario.id === 'inline-props')
			return { onAction: unstableOnAction, config: unstableConfig, tags: unstableTags, label: 'UserCard', ignoreProps: [], logOnEveryRender: false };
		if (scenario.id === 'stable-props')
			return { onAction: stableOnAction, config: stableConfig, tags: stableTags, label, ignoreProps: [], logOnEveryRender: false };
		if (scenario.id === 'mixed-props')
			return { onAction: unstableOnAction, config: unstableConfig, tags: stableTags, label, ignoreProps: [], logOnEveryRender: false };
		return { onAction: stableOnAction, config: stableConfig, tags: stableTags, label, ignoreProps: [], logOnEveryRender: false };
	}, [
		scenario.id,
		stableOnAction, stableConfig, stableTags,
		unstableOnAction, unstableConfig, unstableTags,
		label,
	]);

	const captureProps = useMemo<Record<string, unknown>>(
		() => ({ onAction: cfg.onAction, config: cfg.config, tags: cfg.tags, label: cfg.label }),
		[cfg.onAction, cfg.config, cfg.tags, cfg.label],
	);

	const { entries, clear } = useMemoCapture(captureProps, { ignoreProps: cfg.ignoreProps });

	const handleTrigger = () => {
		if (scenario.triggerBothTicks) {
			setParentTick((t) => t + 1);
			setDataTick((t) => t + 1);
		} else if (scenario.id === 'inline-props') {
			setParentTick((t) => t + 1);
		} else {
			setDataTick((t) => t + 1);
		}
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-5 items-start max-md:grid-cols-1">
				<DemoTarget
					onAction={cfg.onAction}
					config={cfg.config}
					tags={cfg.tags}
					label={cfg.label}
					ignoreProps={cfg.ignoreProps}
					logOnEveryRender={cfg.logOnEveryRender}
				/>
				<ClassificationPanel entries={entries} onClear={clear} />
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

export const MemoEffectAnalyzerDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('inline-props');
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
					{activeScenario.badge === 'warn' ? '⚠ memo ineffective' : '✓ memo effective'}
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
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import { useMemoEffectAnalyzer } from '@sapanmozammel/memo-effect-analyzer';

const UserCard = React.memo((props: UserCardProps) => {
  useMemoEffectAnalyzer('UserCard', props as Record<string, unknown>);
  // rest of your component...
});`}</pre>
					<p className="text-xs text-dim leading-[1.6]">
						No-op in production. Open DevTools console to see the grouped output alongside this
						panel.
					</p>
				</div>
			</details>
		</>
	);
};
