'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { useRenderFrequency } from '@sapanmozammel/why-render-frequency';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

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

type RenderBoxProps = {
	label: string;
	count: number;
	extra?: React.ReactNode;
};

const RenderBox = ({ label, count, extra }: RenderBoxProps) => (
	<div className="relative bg-surface border border-edge rounded-md overflow-hidden">
		<div key={count} className="absolute inset-0 pointer-events-none rounded-md animate-[freq-flash_0.45s_ease-out_forwards] z-0" aria-hidden="true" />
		<div className="relative z-10 flex items-center justify-between px-3 py-2 bg-raised border-b border-edge">
			<span className="text-xs font-semibold text-muted">&lt;{label}&gt;</span>
			<span key={count} className="inline-flex items-center gap-1 text-[11px] text-dim px-2 py-0.5 rounded-full border border-edge bg-elevated animate-[pulse-border_0.3s_ease]" suppressHydrationWarning>
				render #{count}
			</span>
		</div>
		{extra !== undefined && <div className="relative z-10 px-3 py-2.5">{extra}</div>}
	</div>
);

const SearchResultsChild = ({ text }: { text: string }) => {
	useRenderFrequency('SearchResults', { sampleEvery: 1 });
	const renderCount = useRef(0);
	renderCount.current += 1;

	return (
		<RenderBox
			label="SearchResults"
			count={renderCount.current}
			extra={
				<div className="flex items-baseline gap-2 text-xs">
					<span className="text-dim min-w-11 shrink-0">text</span>
					<span className="text-muted break-all">&quot;{text}&quot;</span>
				</div>
			}
		/>
	);
};

const TypingScenario = () => {
	const [text, setText] = useState('');

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col">
				<input
					className="w-full px-3 py-2 bg-raised border border-edge rounded-md text-ink text-[13px] outline-none transition-colors focus:border-brand"
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
		<div className="flex flex-col gap-4">
			<RenderBox
				label="LoopComponent"
				count={renderCount.current}
				extra={
					<div className="flex items-baseline gap-2 text-xs">
						<span className="text-dim min-w-11 shrink-0">status</span>
						<span className={running ? 'text-warn break-all' : 'text-dim break-all'}>
							{running ? `running — tick ${tick}` : 'idle'}
						</span>
					</div>
				}
			/>
			<div className="flex gap-2">
				<button
					className={`inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border text-[11px] cursor-pointer transition-colors ${
						running
							? 'border-transparent bg-transparent text-muted hover:text-ink hover:bg-raised'
							: 'border-brand-dim bg-brand-dim text-brand hover:bg-[#1e4a7a]'
					}`}
					onClick={() => setRunning((r) => !r)}
				>
					{running ? '⏹ Stop loop' : '▶ Start loop'}
				</button>
			</div>
		</div>
	);
};

const ChildObserver = ({ tick }: { tick: number }) => {
	useRenderFrequency('ChildObserver', { sampleEvery: 1 });
	const renderCount = useRef(0);
	renderCount.current += 1;

	return (
		<RenderBox
			label="ChildObserver"
			count={renderCount.current}
			extra={
				<div className="flex items-baseline gap-2 text-xs">
					<span className="text-dim min-w-11 shrink-0">tick</span>
					<span className="text-muted break-all">{tick}</span>
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
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
				<RenderBox
					label="ParentComponent"
					count={renderCount.current}
					extra={
						<div className="flex items-baseline gap-2 text-xs">
							<span className="text-dim min-w-11 shrink-0">state</span>
							<span className="text-muted break-all">tick = {tick}</span>
						</div>
					}
				/>
				<ChildObserver tick={tick} />
			</div>
			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={() => setTick((t) => t + 1)}
				>
					Update parent state
				</button>
			</div>
		</div>
	);
};

const PlainChild = () => {
	useRenderFrequency('PlainComponent', { sampleEvery: 1 });
	const renderCount = useRef(0);
	renderCount.current += 1;

	return (
		<RenderBox
			label="PlainComponent"
			count={renderCount.current}
			extra={
				<span className="inline-flex items-center text-[10px] font-semibold px-1.75 py-0.5 rounded-full text-warn bg-warn-dim">no memo</span>
			}
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
			extra={
				<span className="inline-flex items-center text-[10px] font-semibold px-1.75 py-0.5 rounded-full text-ok bg-ok-dim">React.memo</span>
			}
		/>
	);
});

MemoizedChild.displayName = 'MemoizedChild';

const MemoScenario = () => {
	const [tick, setTick] = useState(0);

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
				<PlainChild />
				<MemoizedChild />
			</div>
			<div className="flex gap-2">
				<button
					className="inline-flex items-center gap-1.5 px-2 py-0.75 rounded-md border border-brand-dim bg-brand-dim text-brand text-[11px] hover:bg-[#1e4a7a] cursor-pointer transition-colors"
					onClick={() => setTick((t) => t + 1)}
				>
					Trigger parent update (tick: {tick})
				</button>
			</div>
		</div>
	);
};

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

			<div className="mb-5 flex flex-col gap-2.5">
				<div className="flex items-center gap-2.5 flex-wrap">
					<span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.75 rounded-full border w-fit ${
						activeScenario.badge === 'warn'
							? 'border-warn-dim bg-warn-dim text-warn'
							: 'border-ok-dim bg-ok-dim text-ok'
					}`}>
						{activeScenario.badge === 'warn' ? '⚠ excessive renders' : '✓ controlled renders'}
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
				{activeId === 'typing' && <TypingScenario />}
				{activeId === 'render-loop' && <RenderLoopScenario />}
				{activeId === 'parent-storm' && <ParentStormScenario />}
				{activeId === 'memo-comparison' && <MemoScenario />}
			</div>

			<details className="border border-edge rounded-[10px] overflow-hidden group mt-2">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					How to add this to your component
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import { useRenderFrequency } from '@sapanmozammel/why-render-frequency';

const UserCard = (props: UserCardProps) => {
  useRenderFrequency('UserCard');
  return <div>{props.user.name}</div>;
};`}</pre>
					<p className="text-xs text-dim leading-[1.6]">
						No-op in production. Open DevTools console to see grouped output — one entry every 10
						renders by default. Set{' '}
						<code>{'{ sampleEvery: 1 }'}</code> to log on every render.
					</p>
				</div>
			</details>
		</>
	);
};
