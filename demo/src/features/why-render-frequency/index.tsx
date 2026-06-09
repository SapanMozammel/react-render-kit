'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { useRenderFrequency } from '@sapanmozammel/why-render-frequency';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

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

// ── RenderBox ─────────────────────────────────────────────────
// Visual card for a monitored component. `count` comes from a
// useRef.current that increments in the caller's render body.
// Passing count as key remounts the flash overlay and badge,
// replaying their CSS animations on every render.

type RenderBoxProps = {
	label: string;
	count: number;
	extra?: React.ReactNode;
};

const RenderBox = ({ label, count, extra }: RenderBoxProps) => (
	<div className="freq-card">
		{/* Remounted via key on every render to replay the flash animation */}
		<div key={count} className="freq-flash" aria-hidden="true" />
		<div className="freq-card__header">
			<span className="freq-card__label">&lt;{label}&gt;</span>
			<span key={count} className="render-badge render-badge--pulse" suppressHydrationWarning>
				render #{count}
			</span>
		</div>
		{extra !== undefined && <div className="freq-card__body">{extra}</div>}
	</div>
);

// ── Scenario 1: Typing Stress Test ────────────────────────────

const SearchResultsChild = ({ text }: { text: string }) => {
	useRenderFrequency('SearchResults', { sampleEvery: 1 });
	const renderCount = useRef(0);
	renderCount.current += 1;

	return (
		<RenderBox
			label="SearchResults"
			count={renderCount.current}
			extra={
				<div className="freq-prop-row">
					<span className="freq-prop-key">text</span>
					<span className="freq-prop-value">&quot;{text}&quot;</span>
				</div>
			}
		/>
	);
};

const TypingScenario = () => {
	const [text, setText] = useState('');

	return (
		<div className="scenario-body">
			<div className="freq-input-row">
				<input
					className="freq-input"
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Type here to trigger re-renders…"
					aria-label="Typing input"
				/>
			</div>
			<SearchResultsChild text={text} />
		</div>
	);
};

// ── Scenario 2: Render Loop Simulator ────────────────────────

const RenderLoopScenario = () => {
	const [running, setRunning] = useState(false);
	const [tick, setTick] = useState(0);

	useRenderFrequency('LoopComponent', { sampleEvery: 1, windowMs: 5000 });
	const renderCount = useRef(0);
	renderCount.current += 1;

	useEffect(() => {
		if (!running) return;
		const id = setInterval(() => setTick((t) => t + 1), 100);
		return () => clearInterval(id);
	}, [running]);

	return (
		<div className="scenario-body">
			<RenderBox
				label="LoopComponent"
				count={renderCount.current}
				extra={
					<div className="freq-prop-row">
						<span className="freq-prop-key">status</span>
						<span className={`freq-prop-value freq-prop-value--${running ? 'warn' : 'muted'}`}>
							{running ? `running — tick ${tick}` : 'idle'}
						</span>
					</div>
				}
			/>
			<div className="scenario-controls">
				<button
					className={`btn ${running ? 'btn--ghost' : 'btn--primary'} btn--sm`}
					onClick={() => setRunning((r) => !r)}
				>
					{running ? '⏹ Stop loop' : '▶ Start loop'}
				</button>
			</div>
		</div>
	);
};

// ── Scenario 3: Parent State Storm ────────────────────────────

const ChildObserver = ({ tick }: { tick: number }) => {
	useRenderFrequency('ChildObserver', { sampleEvery: 1 });
	const renderCount = useRef(0);
	renderCount.current += 1;

	return (
		<RenderBox
			label="ChildObserver"
			count={renderCount.current}
			extra={
				<div className="freq-prop-row">
					<span className="freq-prop-key">tick</span>
					<span className="freq-prop-value">{tick}</span>
				</div>
			}
		/>
	);
};

const ParentStormScenario = () => {
	const [tick, setTick] = useState(0);

	useRenderFrequency('ParentComponent', { sampleEvery: 1 });
	const renderCount = useRef(0);
	renderCount.current += 1;

	return (
		<div className="scenario-body">
			<div className="freq-grid">
				<RenderBox
					label="ParentComponent"
					count={renderCount.current}
					extra={
						<div className="freq-prop-row">
							<span className="freq-prop-key">state</span>
							<span className="freq-prop-value">tick = {tick}</span>
						</div>
					}
				/>
				<ChildObserver tick={tick} />
			</div>
			<div className="scenario-controls">
				<button className="btn btn--primary btn--sm" onClick={() => setTick((t) => t + 1)}>
					Update parent state
				</button>
			</div>
		</div>
	);
};

// ── Scenario 4: Memoized vs Non-Memoized ─────────────────────

const PlainChild = () => {
	useRenderFrequency('PlainComponent', { sampleEvery: 1 });
	const renderCount = useRef(0);
	renderCount.current += 1;

	return (
		<RenderBox
			label="PlainComponent"
			count={renderCount.current}
			extra={<span className="freq-tag freq-tag--warn">no memo</span>}
		/>
	);
};

const MemoizedChild = memo(() => {
	useRenderFrequency('MemoizedComponent', { sampleEvery: 1 });
	const renderCount = useRef(0);
	renderCount.current += 1;

	return (
		<RenderBox
			label="MemoizedComponent"
			count={renderCount.current}
			extra={<span className="freq-tag freq-tag--ok">React.memo</span>}
		/>
	);
});

MemoizedChild.displayName = 'MemoizedChild';

const MemoScenario = () => {
	const [tick, setTick] = useState(0);

	return (
		<div className="scenario-body">
			<div className="freq-grid">
				<PlainChild />
				<MemoizedChild />
			</div>
			<div className="scenario-controls">
				<button className="btn btn--primary btn--sm" onClick={() => setTick((t) => t + 1)}>
					Trigger parent update (tick: {tick})
				</button>
			</div>
		</div>
	);
};

// ── WhyRenderFrequencyDemo ────────────────────────────────────

export const WhyRenderFrequencyDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('typing');
	const [resetKey, setResetKey] = useState(0);

	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	const handleScenarioChange = (id: ScenarioId) => {
		setActiveId(id);
		setResetKey(0);
	};

	const handleReset = () => setResetKey((k) => k + 1);

	return (
		<>
			<ScenarioTabs active={activeId} onChange={handleScenarioChange} />

			<div className="scenario-header">
				<div className="freq-header-row">
					<span className={`scenario-badge scenario-badge--${activeScenario.badge}`}>
						{activeScenario.badge === 'warn' ? '⚠ excessive renders' : '✓ controlled renders'}
					</span>
					<button className="btn btn--ghost btn--sm" onClick={handleReset}>
						↺ Reset
					</button>
				</div>
				<p className="scenario-description">{activeScenario.description}</p>
			</div>

			<div key={`${activeId}-${resetKey}`}>
				{activeId === 'typing' && <TypingScenario />}
				{activeId === 'render-loop' && <RenderLoopScenario />}
				{activeId === 'parent-storm' && <ParentStormScenario />}
				{activeId === 'memo-comparison' && <MemoScenario />}
			</div>

			<details className="code-hint code-hint--usage">
				<summary>How to add this to your component</summary>
				<div className="code-hint__body">
					<pre className="code-hint__pre">{`import { useRenderFrequency } from '@sapanmozammel/why-render-frequency';

const UserCard = (props: UserCardProps) => {
  useRenderFrequency('UserCard');
  return <div>{props.user.name}</div>;
};`}</pre>
					<p className="code-hint__note">
						No-op in production. Open DevTools console to see grouped output — one entry every 10
						renders by default. Set{' '}
						<code>{'{ sampleEvery: 1 }'}</code> to log on every render.
					</p>
				</div>
			</details>
		</>
	);
};
