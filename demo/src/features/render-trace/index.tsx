'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { createEngine, logCycle, useTraceRender } from '@sapanmozammel/render-trace';
import type { RenderCycle, TraceInstance } from '@sapanmozammel/render-trace';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

type InstanceProps = { instance: TraceInstance };

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

type CardBadge = 'root' | 'memo' | 'untraced';

type TraceComponentCardProps = {
	label: string;
	count: number;
	badge?: CardBadge;
};

const TraceComponentCard = ({ label, count, badge }: TraceComponentCardProps) => (
	<div className="relative overflow-hidden bg-raised border border-edge rounded-md px-2.5 py-1.5">
		<div key={count} className="absolute inset-0 pointer-events-none rounded-md animate-[freq-flash_0.45s_ease-out_forwards] z-0" aria-hidden="true" />
		<div className="relative z-10 flex items-center gap-2">
			<span className="text-xs font-semibold text-brand">&lt;{label}&gt;</span>
			{badge === 'root' && (
				<span className="text-[10px] px-1.25 py-px rounded-[3px] font-medium whitespace-nowrap leading-[1.6] bg-brand-dim text-brand">
					root
				</span>
			)}
			{badge === 'memo' && (
				<span className="text-[10px] px-1.25 py-px rounded-[3px] font-medium whitespace-nowrap leading-[1.6] bg-ok-dim text-ok">
					memo
				</span>
			)}
			{badge === 'untraced' && (
				<span className="text-[10px] px-1.25 py-px rounded-[3px] font-medium whitespace-nowrap leading-[1.6] bg-elevated text-dim border border-dashed border-edge">
					untraced
				</span>
			)}
			<span key={count} className="inline-flex items-center gap-1 text-[11px] text-dim px-2 py-0.5 rounded-full border border-edge bg-elevated ml-auto animate-[pulse-border_0.3s_ease]" suppressHydrationWarning>
				#{count}
			</span>
		</div>
	</div>
);

const TracePanel = ({ cycle }: { cycle: RenderCycle | null }) => {
	if (!cycle) {
		return (
			<div className="mt-4 flex items-center justify-center min-h-14 bg-raised border border-edge rounded-md p-3">
				<span className="text-xs text-dim">Trigger a cascade above — the cycle will appear here</span>
			</div>
		);
	}

	const duration = cycle.endTime != null ? `${cycle.endTime - cycle.startTime}ms` : '—';
	const sortedNodes = [...cycle.nodes].sort((a, b) => a.renderIndex - b.renderIndex);

	return (
		<div key={cycle.id} className="mt-4 bg-raised border border-edge rounded-md p-3 animate-[trace-panel-in_0.2s_ease-out]">
			<div className="text-[11px] text-dim mb-2.5 pb-2 border-b border-edge">
				[render-trace] {cycle.id} · {cycle.totalRenders} render
				{cycle.totalRenders !== 1 ? 's' : ''} · root:{' '}
				{cycle.rootTrigger ? `<${cycle.rootTrigger}>` : '?'} · {duration}
			</div>
			<div className="flex gap-5 flex-wrap mb-2.5">
				<span className="flex flex-col gap-px">
					<span className="text-[10px] text-dim">root trigger</span>
					<span className="text-[13px] font-semibold text-ink">
						{cycle.rootTrigger ? `<${cycle.rootTrigger}>` : '?'}
					</span>
				</span>
				<span className="flex flex-col gap-px">
					<span className="text-[10px] text-dim">max depth</span>
					<span className="text-[13px] font-semibold text-ink">{cycle.maxDepth}</span>
				</span>
				<span className="flex flex-col gap-px">
					<span className="text-[10px] text-dim">renders</span>
					<span className="text-[13px] font-semibold text-ink">{cycle.totalRenders}</span>
				</span>
				<span className="flex flex-col gap-px">
					<span className="text-[10px] text-dim">time</span>
					<span className="text-[13px] font-semibold text-ink">{duration}</span>
				</span>
			</div>
			<div className="flex flex-col gap-0.5 text-xs">
				{sortedNodes.map((node) => (
					<div
						key={node.id}
						className="flex items-center gap-1"
						style={{ paddingLeft: `${node.depth * 18}px` }}
					>
						<span className="text-dim">{node.depth > 0 ? '└── ' : ''}</span>
						<span className="text-brand">&lt;{node.componentName}&gt;</span>
						{node.parentName === null && (
							<span className="text-[10px] px-1.25 py-px rounded-[3px] font-medium whitespace-nowrap leading-[1.6] bg-brand-dim text-brand">
								root
							</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

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
		<div className="flex flex-col gap-1">
			<TraceComponentCard label="Child" count={count.current} />
			<div className="ml-2.5 pl-3 pt-1 border-l border-edge flex flex-col gap-1">
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
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1 p-3 bg-raised border border-edge rounded-md">
				<TraceComponentCard label="Parent" count={count.current} badge="root" />
				<div className="ml-2.5 pl-3 pt-1 border-l border-edge flex flex-col gap-1">
					<CascadeChild instance={instance} />
				</div>
			</div>
			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={() => setTick((t) => t + 1)}
				>
					Trigger cascade (tick: {tick})
				</button>
			</div>
		</div>
	);
});
CascadeScenario.displayName = 'CascadeScenario';

type DeepNodeProps = { level: number; maxLevel: number } & InstanceProps;

const DeepNode = ({ level, maxLevel, instance }: DeepNodeProps) => {
	useTraceRender(`Level${level}`, { instance });
	const count = useRef(0);
	count.current += 1;

	return (
		<div className="flex flex-col gap-1">
			{level === 1 ? (
				<TraceComponentCard label={`Level${level}`} count={count.current} badge="root" />
			) : (
				<TraceComponentCard label={`Level${level}`} count={count.current} />
			)}
			{level < maxLevel && (
				<div className="ml-2.5 pl-3 pt-1 border-l border-edge flex flex-col gap-1">
					<DeepNode level={level + 1} maxLevel={maxLevel} instance={instance} />
				</div>
			)}
		</div>
	);
};

const DeepScenario = memo(({ instance }: InstanceProps) => {
	const [tick, setTick] = useState(0);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1 p-3 bg-raised border border-edge rounded-md">
				<DeepNode level={1} maxLevel={5} instance={instance} />
			</div>
			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={() => setTick((t) => t + 1)}
				>
					Trigger 5-level cascade (tick: {tick})
				</button>
			</div>
		</div>
	);
});
DeepScenario.displayName = 'DeepScenario';

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
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1 p-3 bg-raised border border-edge rounded-md">
				<TraceComponentCard label="Form" count={count.current} badge="root" />
				<div className="ml-2.5 pl-3 pt-1 border-l border-edge flex flex-col gap-1">
					{useMemoChild ? (
						<MemoField instance={instance} />
					) : (
						<PlainField instance={instance} />
					)}
				</div>
			</div>
			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={() => setTick((t) => t + 1)}
				>
					Trigger update (tick: {tick})
				</button>
				<button
					className={`inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border text-[11px] cursor-pointer transition-colors ${
						useMemoChild
							? 'border-brand-dim bg-brand-dim text-brand hover:bg-[#1e4a7a]'
							: 'border-transparent bg-transparent text-muted hover:text-ink hover:bg-raised'
					}`}
					onClick={() => setUseMemoChild((v) => !v)}
				>
					{useMemoChild ? '✓ memo ON' : 'memo OFF'}
				</button>
			</div>
		</div>
	);
});
MemoScenario.displayName = 'MemoScenario';

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
		<div className="flex flex-col gap-1">
			<TraceComponentCard label="SearchBar" count={count.current} badge="root" />
			<div className="ml-2.5 pl-3 pt-1 border-l border-edge flex flex-col gap-1">
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
		<div className="flex flex-col gap-1">
			<TraceComponentCard label="ProfileHeader" count={count.current} badge="root" />
			<div className="ml-2.5 pl-3 pt-1 border-l border-edge flex flex-col gap-1">
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
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
				<div className="flex flex-col gap-1 p-3 bg-raised border border-edge rounded-md">
					<TreeA tick={tickA} instance={instance} />
				</div>
				<div className="flex flex-col gap-1 p-3 bg-raised border border-edge rounded-md">
					<TreeB tick={tickB} instance={instance} />
				</div>
			</div>
			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={() => setTickA((t) => t + 1)}
				>
					Trigger SearchBar tree
				</button>
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-transparent bg-transparent text-muted text-[11px] hover:text-ink hover:bg-raised cursor-pointer transition-colors"
					onClick={() => setTickB((t) => t + 1)}
				>
					Trigger ProfileHeader tree
				</button>
			</div>
		</div>
	);
});
RootsScenario.displayName = 'RootsScenario';

export const RenderTraceDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('cascade');
	const [resetKey, setResetKey] = useState(0);
	const [lastCycle, setLastCycle] = useState<RenderCycle | null>(null);

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

			<div className="mb-5 flex flex-col gap-2.5">
				<div className="flex items-center gap-2.5 flex-wrap">
					<span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.75 rounded-full border w-fit ${
						activeScenario.badge === 'warn'
							? 'border-warn-dim bg-warn-dim text-warn'
							: 'border-ok-dim bg-ok-dim text-ok'
					}`}>
						{activeScenario.badge === 'warn' ? '⚠ render cascade' : '✓ cascade controlled'}
					</span>
					<button
						className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-transparent bg-transparent text-muted text-[11px] hover:text-ink hover:bg-raised cursor-pointer transition-colors"
						onClick={handleReset}
					>
						↺ Reset
					</button>
				</div>
				<p className="text-[13px] text-muted max-w-150 leading-[1.7]">{activeScenario.description}</p>
			</div>

			<div key={`${activeId}-${resetKey}`}>
				{activeId === 'cascade' && <CascadeScenario instance={instance} />}
				{activeId === 'deep' && <DeepScenario instance={instance} />}
				{activeId === 'memo' && <MemoScenario instance={instance} />}
				{activeId === 'roots' && <RootsScenario instance={instance} />}
			</div>

			<TracePanel cycle={lastCycle} />

			<details className="border border-edge rounded-[10px] overflow-hidden group mt-2">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					How to add this to your component
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import { useTraceRender } from '@sapanmozammel/render-trace';

const Dashboard = (props) => {
  useTraceRender('Dashboard');
  return <UserList />;
};

const UserList = () => {
  useTraceRender('UserList');
  return users.map((u) => <UserCard key={u.id} user={u} />);
};`}</pre>
					<p className="text-xs text-dim leading-[1.6]">
						Dev-only. Open DevTools console to see the grouped propagation tree — root trigger,
						depth, and all nodes in one cycle entry.
					</p>
				</div>
			</details>
		</>
	);
};
