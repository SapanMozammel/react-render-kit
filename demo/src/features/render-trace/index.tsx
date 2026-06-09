'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { createEngine, logCycle, useTraceRender } from '@sapanmozammel/render-trace';
import type { RenderCycle, TraceInstance } from '@sapanmozammel/render-trace';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

// ── Types ─────────────────────────────────────────────────────

type InstanceProps = { instance: TraceInstance };

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

// ── TraceComponentCard ─────────────────────────────────────────
// Visual card for one instrumented component. key={count} on the
// flash overlay remounts it every render, replaying the animation.

type CardBadge = 'root' | 'memo' | 'untraced';

type TraceComponentCardProps = {
	label: string;
	count: number;
	badge?: CardBadge;
};

const TraceComponentCard = ({ label, count, badge }: TraceComponentCardProps) => (
	<div className="trace-card">
		<div key={count} className="freq-flash" aria-hidden="true" />
		<div className="trace-card__header">
			<span className="trace-card__label">&lt;{label}&gt;</span>
			{badge === 'root' && <span className="trace-badge trace-badge--root">root</span>}
			{badge === 'memo' && <span className="trace-badge trace-badge--memo">memo</span>}
			{badge === 'untraced' && <span className="trace-badge trace-badge--untraced">untraced</span>}
			<span key={count} className="render-badge render-badge--pulse" suppressHydrationWarning>
				#{count}
			</span>
		</div>
	</div>
);

// ── TracePanel ─────────────────────────────────────────────────
// Displays the last captured RenderCycle as a visual tree.
// key={cycle.id} on the outer element replays the enter animation.

const TracePanel = ({ cycle }: { cycle: RenderCycle | null }) => {
	if (!cycle) {
		return (
			<div className="trace-panel trace-panel--empty">
				<span className="trace-empty">Trigger a cascade above — the cycle will appear here</span>
			</div>
		);
	}

	const duration = cycle.endTime != null ? `${cycle.endTime - cycle.startTime}ms` : '—';
	const sortedNodes = [...cycle.nodes].sort((a, b) => a.renderIndex - b.renderIndex);

	return (
		<div key={cycle.id} className="trace-panel">
			<div className="trace-panel__title">
				[render-trace] {cycle.id} · {cycle.totalRenders} render
				{cycle.totalRenders !== 1 ? 's' : ''} · root:{' '}
				{cycle.rootTrigger ? `<${cycle.rootTrigger}>` : '?'} · {duration}
			</div>
			<div className="trace-panel__stats">
				<span className="trace-stat">
					<span className="trace-stat__key">root trigger</span>
					<span className="trace-stat__value">
						{cycle.rootTrigger ? `<${cycle.rootTrigger}>` : '?'}
					</span>
				</span>
				<span className="trace-stat">
					<span className="trace-stat__key">max depth</span>
					<span className="trace-stat__value">{cycle.maxDepth}</span>
				</span>
				<span className="trace-stat">
					<span className="trace-stat__key">renders</span>
					<span className="trace-stat__value">{cycle.totalRenders}</span>
				</span>
				<span className="trace-stat">
					<span className="trace-stat__key">time</span>
					<span className="trace-stat__value">{duration}</span>
				</span>
			</div>
			<div className="trace-nodes">
				{sortedNodes.map((node) => (
					<div
						key={node.id}
						className="trace-node-row"
						style={{ paddingLeft: `${node.depth * 18}px` }}
					>
						<span className="trace-node-row__connector">{node.depth > 0 ? '└── ' : ''}</span>
						<span className="trace-node-row__name">&lt;{node.componentName}&gt;</span>
						{node.parentName === null && (
							<span className="trace-badge trace-badge--root">root</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

// ── Scenario 1: Cascade Chain ─────────────────────────────────

const CascadeGrandChild = ({ instance }: InstanceProps) => {
	useTraceRender('GrandChild', { instance });
	const count = useRef(0);
	count.current += 1;
	return <TraceComponentCard label="GrandChild" count={count.current} />;
};

const CascadeChild = ({ instance }: InstanceProps) => {
	useTraceRender('Child', { instance });
	const count = useRef(0);
	count.current += 1;
	return (
		<div className="trace-subtree">
			<TraceComponentCard label="Child" count={count.current} />
			<div className="trace-subtree__children">
				<CascadeGrandChild instance={instance} />
			</div>
		</div>
	);
};

const CascadeScenario = memo(({ instance }: InstanceProps) => {
	const [tick, setTick] = useState(0);
	useTraceRender('Parent', { instance });
	const count = useRef(0);
	count.current += 1;

	return (
		<div className="scenario-body">
			<div className="trace-hierarchy">
				<TraceComponentCard label="Parent" count={count.current} badge="root" />
				<div className="trace-subtree__children">
					<CascadeChild instance={instance} />
				</div>
			</div>
			<div className="scenario-controls">
				<button className="btn btn--primary btn--sm" onClick={() => setTick((t) => t + 1)}>
					Trigger cascade (tick: {tick})
				</button>
			</div>
		</div>
	);
});
CascadeScenario.displayName = 'CascadeScenario';

// ── Scenario 2: Deep Cascade ──────────────────────────────────

type DeepNodeProps = { level: number; maxLevel: number } & InstanceProps;

const DeepNode = ({ level, maxLevel, instance }: DeepNodeProps) => {
	useTraceRender(`Level${level}`, { instance });
	const count = useRef(0);
	count.current += 1;

	return (
		<div className="trace-subtree">
			{level === 1 ? (
				<TraceComponentCard label={`Level${level}`} count={count.current} badge="root" />
			) : (
				<TraceComponentCard label={`Level${level}`} count={count.current} />
			)}
			{level < maxLevel && (
				<div className="trace-subtree__children">
					<DeepNode level={level + 1} maxLevel={maxLevel} instance={instance} />
				</div>
			)}
		</div>
	);
};

const DeepScenario = memo(({ instance }: InstanceProps) => {
	const [tick, setTick] = useState(0);

	return (
		<div className="scenario-body">
			<div className="trace-hierarchy">
				<DeepNode level={1} maxLevel={5} instance={instance} />
			</div>
			<div className="scenario-controls">
				<button className="btn btn--primary btn--sm" onClick={() => setTick((t) => t + 1)}>
					Trigger 5-level cascade (tick: {tick})
				</button>
			</div>
		</div>
	);
});
DeepScenario.displayName = 'DeepScenario';

// ── Scenario 3: Memo Firewall ─────────────────────────────────

const PlainField = ({ instance }: InstanceProps) => {
	useTraceRender('PlainField', { instance });
	const count = useRef(0);
	count.current += 1;
	return <TraceComponentCard label="PlainField" count={count.current} />;
};

const MemoField = memo(({ instance }: InstanceProps) => {
	useTraceRender('MemoField', { instance });
	const count = useRef(0);
	count.current += 1;
	return <TraceComponentCard label="MemoField" count={count.current} badge="memo" />;
});
MemoField.displayName = 'MemoField';

const MemoScenario = memo(({ instance }: InstanceProps) => {
	const [useMemoChild, setUseMemoChild] = useState(false);
	const [tick, setTick] = useState(0);
	useTraceRender('Form', { instance });
	const count = useRef(0);
	count.current += 1;

	return (
		<div className="scenario-body">
			<div className="trace-hierarchy">
				<TraceComponentCard label="Form" count={count.current} badge="root" />
				<div className="trace-subtree__children">
					{useMemoChild ? (
						<MemoField instance={instance} />
					) : (
						<PlainField instance={instance} />
					)}
				</div>
			</div>
			<div className="scenario-controls">
				<button className="btn btn--primary btn--sm" onClick={() => setTick((t) => t + 1)}>
					Trigger update (tick: {tick})
				</button>
				<button
					className={`btn btn--sm ${useMemoChild ? 'btn--primary' : 'btn--ghost'}`}
					onClick={() => setUseMemoChild((v) => !v)}
				>
					{useMemoChild ? '✓ memo ON' : 'memo OFF'}
				</button>
			</div>
		</div>
	);
});
MemoScenario.displayName = 'MemoScenario';

// ── Scenario 4: Source Detection ──────────────────────────────

const TreeAChild = ({ instance }: InstanceProps) => {
	useTraceRender('SearchResults', { instance });
	const count = useRef(0);
	count.current += 1;
	return <TraceComponentCard label="SearchResults" count={count.current} />;
};

const TreeA = memo(({ tick: _tick, instance }: { tick: number } & InstanceProps) => {
	useTraceRender('SearchBar', { instance });
	const count = useRef(0);
	count.current += 1;
	return (
		<div className="trace-subtree">
			<TraceComponentCard label="SearchBar" count={count.current} badge="root" />
			<div className="trace-subtree__children">
				<TreeAChild instance={instance} />
			</div>
		</div>
	);
});
TreeA.displayName = 'TreeA';

const TreeBChild = ({ instance }: InstanceProps) => {
	useTraceRender('ProfileAvatar', { instance });
	const count = useRef(0);
	count.current += 1;
	return <TraceComponentCard label="ProfileAvatar" count={count.current} />;
};

const TreeB = memo(({ tick: _tick, instance }: { tick: number } & InstanceProps) => {
	useTraceRender('ProfileHeader', { instance });
	const count = useRef(0);
	count.current += 1;
	return (
		<div className="trace-subtree">
			<TraceComponentCard label="ProfileHeader" count={count.current} badge="root" />
			<div className="trace-subtree__children">
				<TreeBChild instance={instance} />
			</div>
		</div>
	);
});
TreeB.displayName = 'TreeB';

const RootsScenario = memo(({ instance }: InstanceProps) => {
	const [tickA, setTickA] = useState(0);
	const [tickB, setTickB] = useState(0);

	return (
		<div className="scenario-body">
			<div className="freq-grid">
				<div className="trace-hierarchy">
					<TreeA tick={tickA} instance={instance} />
				</div>
				<div className="trace-hierarchy">
					<TreeB tick={tickB} instance={instance} />
				</div>
			</div>
			<div className="scenario-controls">
				<button className="btn btn--primary btn--sm" onClick={() => setTickA((t) => t + 1)}>
					Trigger SearchBar tree
				</button>
				<button className="btn btn--ghost btn--sm" onClick={() => setTickB((t) => t + 1)}>
					Trigger ProfileHeader tree
				</button>
			</div>
		</div>
	);
});
RootsScenario.displayName = 'RootsScenario';

// ── RenderTraceDemo ────────────────────────────────────────────

export const RenderTraceDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('cascade');
	const [resetKey, setResetKey] = useState(0);
	const [lastCycle, setLastCycle] = useState<RenderCycle | null>(null);

	// Prevent the microtask-driven setLastCycle from firing before React commits
	// the hydration. The engine flushes via queueMicrotask, which can fire while
	// React is still reconciling the server HTML — causing a TracePanel mismatch
	// (server: empty panel, client: panel with cycle data). Gating behind this ref
	// ensures state updates only happen post-mount on the client.
	const mountedRef = useRef(false);
	useEffect(() => {
		mountedRef.current = true;
	}, []);

	const instanceRef = useRef<TraceInstance | null>(null);
	if (instanceRef.current === null) {
		instanceRef.current = createEngine({ logMode: 'tree' }, (cycle, mode) => {
			if (mountedRef.current) setLastCycle(cycle);
			logCycle(cycle, mode);
		});
	}
	const instance = instanceRef.current;

	const activeScenario = SCENARIOS.find((s) => s.id === activeId) as Scenario;

	const handleScenarioChange = (id: ScenarioId) => {
		setActiveId(id);
		setResetKey(0);
		instance.resetTrace();
		setLastCycle(null);
	};

	const handleReset = () => {
		setResetKey((k) => k + 1);
		instance.resetTrace();
		setLastCycle(null);
	};

	return (
		<>
			<ScenarioTabs active={activeId} onChange={handleScenarioChange} />

			<div className="scenario-header">
				<div className="freq-header-row">
					<span className={`scenario-badge scenario-badge--${activeScenario.badge}`}>
						{activeScenario.badge === 'warn' ? '⚠ render cascade' : '✓ cascade controlled'}
					</span>
					<button className="btn btn--ghost btn--sm" onClick={handleReset}>
						↺ Reset
					</button>
				</div>
				<p className="scenario-description">{activeScenario.description}</p>
			</div>

			<div key={`${activeId}-${resetKey}`}>
				{activeId === 'cascade' && <CascadeScenario instance={instance} />}
				{activeId === 'deep' && <DeepScenario instance={instance} />}
				{activeId === 'memo' && <MemoScenario instance={instance} />}
				{activeId === 'roots' && <RootsScenario instance={instance} />}
			</div>

			<TracePanel cycle={lastCycle} />

			<details className="code-hint code-hint--usage">
				<summary>How to add this to your component</summary>
				<div className="code-hint__body">
					<pre className="code-hint__pre">{`import { useTraceRender } from '@sapanmozammel/render-trace';

const Dashboard = (props) => {
  useTraceRender('Dashboard');
  return <UserList />;
};

const UserList = () => {
  useTraceRender('UserList');
  return users.map((u) => <UserCard key={u.id} user={u} />);
};`}</pre>
					<p className="code-hint__note">
						Dev-only. Open DevTools console to see the grouped propagation tree — root trigger,
						depth, and all nodes in one cycle entry.
					</p>
				</div>
			</details>
		</>
	);
};
