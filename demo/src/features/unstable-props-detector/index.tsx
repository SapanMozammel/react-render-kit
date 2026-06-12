'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUnstablePropsDetector } from '@sapanmozammel/unstable-props-detector';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

type SettingsProps = {
	onSelect: () => void;
	config: { theme: string };
	tags: string[];
};

type CaptureEntry = {
	id: string;
	at: Date;
	renderNumber: number;
	status: 'unstable' | 'stable';
	unstableProps: Array<{ name: string; type: 'function' | 'array' | 'object' }>;
};

type ScenarioCfg = SettingsProps & {
	ignoreProps: string[];
	logOnEveryRender: boolean;
};

const classifyRef = (v: unknown): 'function' | 'array' | 'object' | null => {
	if (typeof v === 'function') return 'function';
	if (Array.isArray(v)) return 'array';
	if (typeof v === 'object' && v !== null) return 'object';
	return null;
};

const formatTime = (d: Date): string => d.toTimeString().slice(0, 8);

const useInstabilityCapture = (
	props: Record<string, unknown>,
	options: { ignoreProps: string[]; logOnEveryRender: boolean },
) => {
	const { ignoreProps, logOnEveryRender } = options;
	const prevRef = useRef<Record<string, unknown> | null>(null);
	const renderNumberRef = useRef(0);
	const pendingRef = useRef<CaptureEntry | null>(null);
	const [entries, setEntries] = useState<CaptureEntry[]>([]);

	renderNumberRef.current += 1;

	if (prevRef.current === null) {
		prevRef.current = props;
	} else {
		const prev = prevRef.current;
		const unstableProps: CaptureEntry['unstableProps'] = [];

		for (const key of Object.keys(props)) {
			if (ignoreProps.includes(key)) continue;
			if (Object.is(prev[key], props[key])) continue;
			const type = classifyRef(props[key]);
			if (type !== null) unstableProps.push({ name: key, type });
		}

		if (unstableProps.length > 0) {
			pendingRef.current = {
				id: crypto.randomUUID(),
				at: new Date(),
				renderNumber: renderNumberRef.current,
				status: 'unstable',
				unstableProps,
			};
		} else if (logOnEveryRender) {
			pendingRef.current = {
				id: crypto.randomUUID(),
				at: new Date(),
				renderNumber: renderNumberRef.current,
				status: 'stable',
				unstableProps: [],
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
	});

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

const InstabilityPanel = ({ entries, onClear }: { entries: CaptureEntry[]; onClear: () => void }) => (
	<div className="bg-surface border border-edge rounded-[10px] overflow-hidden">
		<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-raised">
			<span className="text-[11px] text-muted uppercase tracking-[0.08em] font-semibold">useUnstablePropsDetector output</span>
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
				entries.map((entry) =>
					entry.status === 'stable' ? (
						<div key={entry.id} className="py-1.5 border-b border-edge text-dim text-[11px] last:border-b-0">
							✓ render #{entry.renderNumber} — stable {formatTime(entry.at)}
						</div>
					) : (
						<div key={entry.id} className="border-b border-edge py-2.5 last:border-b-0">
							<div className="flex items-center justify-between mb-2">
								<span className="text-ink font-semibold">
									[unstable-props-detector] &lt;SettingsPanel&gt;
								</span>
								<span className="flex items-center gap-2">
									<span className="text-[10px] font-semibold px-1.5 py-px rounded-full text-warn bg-warn-dim">
										⚠ reference
									</span>
									<span className="text-dim text-[11px]">render #{entry.renderNumber}</span>
									<span className="text-dim text-[11px]">{formatTime(entry.at)}</span>
								</span>
							</div>
							<div className="mb-1.5">
								<div className="text-dim text-[11px] uppercase tracking-[0.06em] mb-0.75">Potentially Unstable Props</div>
								{entry.unstableProps.map((p) => (
									<div key={p.name} className="flex gap-3 py-px pl-2 border-l-2 border-purple">
										<span className="text-muted min-w-20 shrink-0">{p.name}</span>
										<span className="text-[10px] text-dim whitespace-nowrap">{p.type} · new reference</span>
									</div>
								))}
							</div>
						</div>
					),
				)
			)}
		</div>
	</div>
);

type DemoTargetProps = ScenarioCfg;

const DemoTarget = ({ onSelect, config, tags, ignoreProps, logOnEveryRender }: DemoTargetProps) => {
	const props: Record<string, unknown> = { onSelect, config, tags };
	useUnstablePropsDetector('SettingsPanel', props, { ignoreProps, logOnEveryRender });
	const renderCountRef = useRef(0);
	renderCountRef.current += 1;

	return (
		<div className="bg-elevated border border-edge rounded-md overflow-hidden mb-4">
			<div className="text-[11px] text-dim px-3 py-1.5 border-b border-edge bg-raised flex items-center justify-between">
				&lt;SettingsPanel&gt;
				<span className="inline-flex items-center gap-1 text-[11px] text-dim px-2 py-0.5 rounded-full border border-edge bg-elevated ml-2" suppressHydrationWarning>
					render #{renderCountRef.current}
				</span>
			</div>
			<div className="p-3">
				<div className="flex gap-3 py-0.75 text-[13px]">
					<span className="text-muted min-w-20 shrink-0">onSelect</span>
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
			</div>
		</div>
	);
};

const ScenarioInner = ({ scenario }: { scenario: Scenario }) => {
	const [parentTick, setParentTick] = useState(0);

	const stableOnSelect = useCallback(() => {}, []);
	const stableConfig = useMemo<{ theme: string }>(() => ({ theme: 'dark' }), []);
	const stableTags = useMemo<string[]>(() => ['admin'], []);

	const unstableOnSelect = useCallback(() => {}, [parentTick]);
	const unstableConfig = useMemo<{ theme: string }>(() => ({ theme: 'dark' }), [parentTick]);
	const unstableTags = useMemo<string[]>(() => ['admin'], [parentTick]);

	const cfg = useMemo<ScenarioCfg>(() => {
		if (scenario.id === 'inline-props')
			return { onSelect: unstableOnSelect, config: unstableConfig, tags: unstableTags, ignoreProps: [], logOnEveryRender: false };
		if (scenario.id === 'stable-props')
			return { onSelect: stableOnSelect, config: stableConfig, tags: stableTags, ignoreProps: [], logOnEveryRender: true };
		if (scenario.id === 'mixed-props')
			return { onSelect: stableOnSelect, config: unstableConfig, tags: unstableTags, ignoreProps: [], logOnEveryRender: false };
		return { onSelect: unstableOnSelect, config: stableConfig, tags: stableTags, ignoreProps: ['onSelect'], logOnEveryRender: true };
	}, [scenario.id, stableOnSelect, stableConfig, stableTags, unstableOnSelect, unstableConfig, unstableTags]);

	const captureProps = useMemo<Record<string, unknown>>(
		() => ({ onSelect: cfg.onSelect, config: cfg.config, tags: cfg.tags }),
		[cfg.onSelect, cfg.config, cfg.tags],
	);

	const { entries, clear } = useInstabilityCapture(captureProps, {
		ignoreProps: cfg.ignoreProps,
		logOnEveryRender: cfg.logOnEveryRender,
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-5 items-start max-md:grid-cols-1">
				<DemoTarget
					onSelect={cfg.onSelect}
					config={cfg.config}
					tags={cfg.tags}
					ignoreProps={cfg.ignoreProps}
					logOnEveryRender={cfg.logOnEveryRender}
				/>
				<InstabilityPanel entries={entries} onClear={clear} />
			</div>

			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand-dim bg-brand-dim text-brand text-xs hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={() => setParentTick((t) => t + 1)}
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
						<div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-error">❌ The bug:</div>
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

export const UnstablePropsDetectorDemo = () => {
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
					{activeScenario.badge === 'warn' ? '⚠ unstable references' : '✓ references stable'}
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
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import { useUnstablePropsDetector } from '@sapanmozammel/unstable-props-detector';

const SettingsPanel = (props: SettingsPanelProps) => {
  useUnstablePropsDetector('SettingsPanel', props as Record<string, unknown>);
  // rest of your component...
};`}</pre>
					<p className="text-xs text-dim leading-[1.6]">
						No-op in production. Open DevTools console to see the grouped output alongside this
						panel.
					</p>
				</div>
			</details>
		</>
	);
};
