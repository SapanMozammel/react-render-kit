'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMemoEffectAnalyzer } from '@sapanmozammel/memo-effect-analyzer';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

// ── Types ──────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────

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

// ── useMemoCapture — mirrors classifier logic for visual panel ─

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

// ── ClassificationPanel ────────────────────────────────────────

const BADGE_CLASS: Record<SignalKind, string> = {
	genuine: 'console-entry__badge--ok',
	'reference-only': 'console-entry__badge--warn',
	mixed: 'console-entry__badge--warn',
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

const SESSION_BADGE_CLASS: Record<MemoClassification, string> = {
	NOT_APPLICABLE: 'console-entry__badge--ok',
	EFFECTIVE: 'console-entry__badge--ok',
	INEFFECTIVE: 'console-entry__badge--warn',
	PARTIALLY_EFFECTIVE: 'console-entry__badge--warn',
};

const ClassificationPanel = ({
	entries,
	onClear,
}: {
	entries: CaptureEntry[];
	onClear: () => void;
}) => (
	<div className="demo-pane">
		<div className="demo-pane__header">
			<span className="demo-pane__title">useMemoEffectAnalyzer output</span>
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
							<span className="console-entry__title">
								[memo-effect-analyzer] &lt;UserCard&gt;
							</span>
							<span className="console-entry__meta">
								{entry.kind !== null && (
									<span className={`console-entry__badge ${BADGE_CLASS[entry.kind]}`}>
										{KIND_LABEL[entry.kind]}
									</span>
								)}
								<span className={`console-entry__badge ${SESSION_BADGE_CLASS[entry.sessionClass]}`}>
									{SESSION_LABEL[entry.sessionClass]}
								</span>
								<span className="console-entry__render">render #{entry.renderNumber}</span>
								<span className="console-entry__time">{formatTime(entry.at)}</span>
							</span>
						</div>
						{entry.genuineKeys.length > 0 && (
							<div className="console-section">
								<div className="console-section__label">Genuine Changes</div>
								{entry.genuineKeys.map((k) => (
									<div key={k} className="console-section__line console-section__line--added">
										<span className="console-line__key">{k}</span>
										<span className="console-line__added">data changed</span>
									</div>
								))}
							</div>
						)}
						{entry.unstableProps.length > 0 && (
							<div className="console-section">
								<div className="console-section__label">Reference Instability</div>
								{entry.unstableProps.map((p) => (
									<div key={p.name} className="console-section__line console-section__line--reference">
										<span className="console-line__key">{p.name}</span>
										<span className="console-line__ref">{p.type} · new reference</span>
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

type DemoTargetProps = ScenarioCfg;

const DemoTarget = ({ onAction, config, tags, label, ignoreProps, logOnEveryRender }: DemoTargetProps) => {
	const props: Record<string, unknown> = { onAction, config, tags, label };
	useMemoEffectAnalyzer('UserCard', props, { ignoreProps, logOnEveryRender });
	const renderCountRef = useRef(0);
	renderCountRef.current += 1;

	return (
		<div className="component-preview">
			<div className="component-preview__label">
				&lt;UserCard&gt;
				<span className="render-badge" suppressHydrationWarning>
					render #{renderCountRef.current}
				</span>
			</div>
			<div className="component-preview__body">
				<div className="prop-row">
					<span className="prop-row__key">onAction</span>
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
					<span className="prop-row__value prop-row__value--object">
						[{tags.join(', ')}]
					</span>
				</div>
				<div className="prop-row">
					<span className="prop-row__key">label</span>
					<span className="prop-row__value">&quot;{label}&quot;</span>
				</div>
			</div>
		</div>
	);
};

// ── ScenarioInner ──────────────────────────────────────────────

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
		// data-change
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
		<div className="scenario-body">
			<div className="demo-grid">
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

// ── MemoEffectAnalyzerDemo ─────────────────────────────────────

export const MemoEffectAnalyzerDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('inline-props');
	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	return (
		<>
			<ScenarioTabs active={activeId} onChange={setActiveId} />

			<div className="scenario-header">
				<span className={`scenario-badge scenario-badge--${activeScenario.badge}`}>
					{activeScenario.badge === 'warn' ? '⚠ memo ineffective' : '✓ memo effective'}
				</span>
				<p className="scenario-description">{activeScenario.description}</p>
			</div>

			<ScenarioInner key={activeId} scenario={activeScenario} />

			<details className="code-hint code-hint--usage">
				<summary>How to add this to your component</summary>
				<div className="code-hint__body">
					<pre className="code-hint__pre">{`import { useMemoEffectAnalyzer } from '@sapanmozammel/memo-effect-analyzer';

const UserCard = React.memo((props: UserCardProps) => {
  useMemoEffectAnalyzer('UserCard', props as Record<string, unknown>);
  // rest of your component...
});`}</pre>
					<p className="code-hint__note">
						No-op in production. Open DevTools console to see the grouped output alongside this
						panel.
					</p>
				</div>
			</details>
		</>
	);
};
