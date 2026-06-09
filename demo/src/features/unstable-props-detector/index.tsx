'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUnstablePropsDetector } from '@sapanmozammel/unstable-props-detector';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

// ── Types ─────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────

const classifyRef = (v: unknown): 'function' | 'array' | 'object' | null => {
	if (typeof v === 'function') return 'function';
	if (Array.isArray(v)) return 'array';
	if (typeof v === 'object' && v !== null) return 'object';
	return null;
};

const formatTime = (d: Date): string => d.toTimeString().slice(0, 8);

// ── useInstabilityCapture ─────────────────────────────────────

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

	// Flush pending entry — side effect: appending to UI log, not deriving state
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

// ── ScenarioTabs ──────────────────────────────────────────────

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

// ── InstabilityPanel ──────────────────────────────────────────

const InstabilityPanel = ({ entries, onClear }: { entries: CaptureEntry[]; onClear: () => void }) => (
	<div className="demo-pane">
		<div className="demo-pane__header">
			<span className="demo-pane__title">useUnstablePropsDetector output</span>
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
				entries.map((entry) =>
					entry.status === 'stable' ? (
						<div key={entry.id} className="console-entry console-entry--silent">
							✓ render #{entry.renderNumber} — stable {formatTime(entry.at)}
						</div>
					) : (
						<div key={entry.id} className="console-entry">
							<div className="console-entry__header">
								<span className="console-entry__title">
									[unstable-props-detector] &lt;SettingsPanel&gt;
								</span>
								<span className="console-entry__meta">
									<span className="console-entry__badge console-entry__badge--warn">
										⚠ reference
									</span>
									<span className="console-entry__render">render #{entry.renderNumber}</span>
									<span className="console-entry__time">{formatTime(entry.at)}</span>
								</span>
							</div>
							<div className="console-section">
								<div className="console-section__label">Potentially Unstable Props</div>
								{entry.unstableProps.map((p) => (
									<div key={p.name} className="console-section__line console-section__line--reference">
										<span className="console-line__key">{p.name}</span>
										<span className="console-line__ref-hint">{p.type} · new reference</span>
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

// ── DemoTarget ────────────────────────────────────────────────

type DemoTargetProps = ScenarioCfg;

const DemoTarget = ({ onSelect, config, tags, ignoreProps, logOnEveryRender }: DemoTargetProps) => {
	const props: Record<string, unknown> = { onSelect, config, tags };
	useUnstablePropsDetector('SettingsPanel', props, { ignoreProps, logOnEveryRender });
	const renderCountRef = useRef(0);
	renderCountRef.current += 1;

	return (
		<div className="component-preview">
			<div className="component-preview__label">
				&lt;SettingsPanel&gt;
				<span className="render-badge" suppressHydrationWarning>
					render #{renderCountRef.current}
				</span>
			</div>
			<div className="component-preview__body">
				<div className="prop-row">
					<span className="prop-row__key">onSelect</span>
					<span className="prop-row__value prop-row__value--function">[Function]</span>
				</div>
				<div className="prop-row">
					<span className="prop-row__key">config</span>
					<span className="prop-row__value prop-row__value--object">
						{'{'}theme:&quot;{config.theme}&quot;{'}'}
					</span>
				</div>
				<div className="prop-row">
					<span className="prop-row__key">tags</span>
					<span className="prop-row__value prop-row__value--object">[{tags.join(', ')}]</span>
				</div>
			</div>
		</div>
	);
};

// ── ScenarioInner ─────────────────────────────────────────────

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
		// ignore-list: onSelect inline but suppressed
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
		<div className="scenario-body">
			<div className="demo-grid">
				<DemoTarget
					onSelect={cfg.onSelect}
					config={cfg.config}
					tags={cfg.tags}
					ignoreProps={cfg.ignoreProps}
					logOnEveryRender={cfg.logOnEveryRender}
				/>
				<InstabilityPanel entries={entries} onClear={clear} />
			</div>

			<div className="scenario-controls">
				<button className="btn btn--primary" onClick={() => setParentTick((t) => t + 1)}>
					{scenario.triggerLabel}
				</button>
			</div>

			<details className="code-hint">
				<summary>See the code</summary>
				<div className="code-hint__body">
					{scenario.canFix && (
						<div className="code-hint__label code-hint__label--bad">❌ The bug:</div>
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

// ── UnstablePropsDetectorDemo ─────────────────────────────────

export const UnstablePropsDetectorDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('inline-props');

	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	const handleScenarioChange = (id: ScenarioId) => {
		setActiveId(id);
	};

	return (
		<>
			<ScenarioTabs active={activeId} onChange={handleScenarioChange} />

			<div className="scenario-header">
				<span className={`scenario-badge scenario-badge--${activeScenario.badge}`}>
					{activeScenario.badge === 'warn' ? '⚠ unstable references' : '✓ references stable'}
				</span>
				<p className="scenario-description">{activeScenario.description}</p>
			</div>

			<ScenarioInner key={activeId} scenario={activeScenario} />

			<details className="code-hint code-hint--usage">
				<summary>How to add this to your component</summary>
				<div className="code-hint__body">
					<pre className="code-hint__pre">{`import { useUnstablePropsDetector } from '@sapanmozammel/unstable-props-detector';

const SettingsPanel = (props: SettingsPanelProps) => {
  useUnstablePropsDetector('SettingsPanel', props as Record<string, unknown>);
  // rest of your component...
};`}</pre>
					<p className="code-hint__note">
						No-op in production. Open DevTools console to see the grouped output alongside this
						panel.
					</p>
				</div>
			</details>
		</>
	);
};
