'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useWhyRender } from 'why-render';
import ConsolePanel from '@/components/console-panel';
import { usePropLog } from '@/hooks/use-prop-log';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

// ── Types ────────────────────────────────────────────────────

type User = { id: number; role: string };

type DemoProps = {
	name: string;
	age: number;
	user: User;
	onSave: () => void;
};

// ── Toggle ───────────────────────────────────────────────────

type ToggleProps = {
	checked: boolean;
	onChange: (v: boolean) => void;
	label: string;
};

const Toggle = ({ checked, onChange, label }: ToggleProps) => (
	<label className="toggle">
		<input
			type="checkbox"
			checked={checked}
			onChange={(e) => onChange(e.target.checked)}
			style={{ position: 'absolute', opacity: 0, width: 1, height: 1, margin: 0 }}
		/>
		<span className={`toggle__track${checked ? ' toggle__track--on' : ''}`}>
			<span className="toggle__thumb" />
		</span>
		{label}
	</label>
);

// ── Scenario tabs ─────────────────────────────────────────────

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

// ── DemoTarget ───────────────────────────────────────────────
// The component being "debugged". useWhyRender logs to the real console.

type DemoTargetProps = DemoProps & {
	changedKeys: ReadonlySet<string>;
	latestRenderNumber: number;
};

const DemoTarget = ({ changedKeys, latestRenderNumber, ...props }: DemoTargetProps) => {
	useWhyRender('UserCard', props as Record<string, unknown>);
	const renderCountRef = useRef(0);
	renderCountRef.current += 1;
	const { name, age, user, onSave } = props;

	const propRow = (key: string, valueNode: React.ReactNode) => {
		const changed = changedKeys.has(key);
		return (
			<div
				key={changed ? `${key}-${latestRenderNumber}` : key}
				className={`prop-row${changed ? ' prop-row--changed' : ''}`}
			>
				<span className="prop-row__key">{key}</span>
				{valueNode}
			</div>
		);
	};

	return (
		<div className="component-preview">
			<div className="component-preview__label">
				&lt;UserCard&gt;
				<span className="render-badge" suppressHydrationWarning>
					render #{renderCountRef.current}
				</span>
			</div>
			<div className="component-preview__body">
				{propRow('name', <span className="prop-row__value">&quot;{name}&quot;</span>)}
				{propRow('age', <span className="prop-row__value">{age}</span>)}
				{propRow(
					'user',
					<span className="prop-row__value prop-row__value--object">
						{'{'}id:{user.id}, role:&quot;{user.role}&quot;{'}'}
					</span>,
				)}
				{propRow(
					'onSave',
					<span className="prop-row__value prop-row__value--function">
						[Function: {(onSave as { name?: string }).name || 'anonymous'}]
					</span>,
				)}
			</div>
		</div>
	);
};

// ── ScenarioInner ─────────────────────────────────────────────
// Remounts when (scenarioId + fixed) key changes, ensuring clean state.

type ScenarioInnerProps = {
	scenario: Scenario;
	fixed: boolean;
};

const ScenarioInner = ({ scenario, fixed }: ScenarioInnerProps) => {
	const [parentTick, setParentTick] = useState(0);
	const [nameFlip, setNameFlip] = useState(false);

	// Stable references — never change across renders
	const stableUser = useMemo<User>(() => ({ id: 1, role: 'admin' }), []);
	const stableOnSave = useCallback(() => {}, []);

	// Unstable references — new reference every time parentTick increments
	// These simulate a parent passing inline object/callback literals
	const unstableUser = useMemo<User>(() => ({ id: 1, role: 'admin' }), [parentTick]);
	const unstableOnSave = useCallback(() => {}, [parentTick]);

	// Derive actual props based on scenario + fixed mode
	const user = scenario.id === 'inline-object' && !fixed ? unstableUser : stableUser;
	const onSave = scenario.id === 'inline-callback' && !fixed ? unstableOnSave : stableOnSave;
	const name = scenario.id === 'real-change' && nameFlip ? 'Bob' : 'Alice';

	const demoProps = useMemo<DemoProps>(
		() => ({ name, age: 25, user, onSave }),
		[name, user, onSave],
	);

	const { entries, clear } = usePropLog('UserCard', demoProps as Record<string, unknown>);

	// Derive changed keys from the latest entry — no state, no effects
	const changedKeys = useMemo<ReadonlySet<string>>(
		() => new Set(entries[0]?.changes.map((c) => c.key) ?? []),
		[entries],
	);
	const latestRenderNumber = entries[0]?.renderNumber ?? 0;

	const handleTrigger = () => {
		if (scenario.id === 'real-change') {
			setNameFlip((v) => !v);
		} else {
			setParentTick((t) => t + 1);
		}
	};

	return (
		<div className="scenario-body">
			<div className="demo-grid">
				{/* Left pane — component preview */}
				<DemoTarget
					{...demoProps}
					changedKeys={changedKeys}
					latestRenderNumber={latestRenderNumber}
				/>

				{/* Right pane — hook output */}
				<ConsolePanel entries={entries} onClear={clear} />
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
						<div className="code-hint__label code-hint__label--bad">
							{fixed ? 'The bug (before fix):' : '❌ The bug:'}
						</div>
					)}
					<pre className="code-hint__pre">{scenario.codeBreaking}</pre>
					{scenario.canFix && scenario.codeFixed && (
						<>
							<div className="code-hint__label code-hint__label--good">
								{fixed ? '✅ The fix (applied):' : '✅ The fix:'}
							</div>
							<pre className="code-hint__pre">{scenario.codeFixed}</pre>
						</>
					)}
				</div>
			</details>
		</div>
	);
};

// ── WhyRenderDemo ─────────────────────────────────────────────

export const WhyRenderDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('inline-object');
	const [fixed, setFixed] = useState(false);

	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	const handleScenarioChange = (id: ScenarioId) => {
		setActiveId(id);
		setFixed(false);
	};

	return (
		<>
			<ScenarioTabs active={activeId} onChange={handleScenarioChange} />

			<div className="scenario-header">
				<span className={`scenario-badge scenario-badge--${activeScenario.badge}`}>
					{activeScenario.badge === 'warn' ? '⚠ unnecessary re-render' : '✓ expected behavior'}
				</span>
				<p className="scenario-description">{activeScenario.description}</p>
				{activeScenario.canFix && (
					<div className="scenario-fix-row">
						<Toggle checked={fixed} onChange={setFixed} label="Show fix" />
						{fixed && activeScenario.fixDescription && (
							<span className="scenario-fix-note">{activeScenario.fixDescription}</span>
						)}
					</div>
				)}
			</div>

			<ScenarioInner
				key={`${activeId}-${String(fixed)}`}
				scenario={activeScenario}
				fixed={fixed}
			/>

			<details className="code-hint code-hint--usage">
				<summary>How to add this to your component</summary>
				<div className="code-hint__body">
					<pre className="code-hint__pre">{`import { useWhyRender } from 'why-render';

const UserCard = (props: UserCardProps) => {
  useWhyRender('UserCard', props);
  // rest of your component...
};`}</pre>
					<p className="code-hint__note">
						No-op in production. Open DevTools console to see output alongside this panel.
					</p>
				</div>
			</details>
		</>
	);
};
