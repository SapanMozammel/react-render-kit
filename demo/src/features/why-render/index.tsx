'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useWhyRender } from '@sapanmozammel/why-render';
import ConsolePanel from '@/components/console-panel';
import { usePropLog } from '@/hooks/use-prop-log';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

type User = { id: number; role: string };

type DemoProps = {
	name: string;
	age: number;
	user: User;
	onSave: () => void;
};

type ToggleProps = {
	checked: boolean;
	onChange: (v: boolean) => void;
	label: string;
};

const Toggle = ({ checked, onChange, label }: ToggleProps) => (
	<label className="flex items-center gap-2 cursor-pointer text-xs text-muted select-none">
		<input
			type="checkbox"
			checked={checked}
			onChange={(e) => onChange(e.target.checked)}
			className="absolute opacity-0 w-px h-px m-0"
		/>
		<span className={`w-8 h-4.5 rounded-[9px] border relative transition-all duration-150 shrink-0 ${checked ? 'bg-brand-dim border-brand' : 'bg-elevated border-edge'}`}>
			<span className={`w-3 h-3 rounded-full absolute top-0.75 left-0.75 transition-all duration-150 ${checked ? 'translate-x-3.5 bg-brand' : 'bg-dim'}`} />
		</span>
		{label}
	</label>
);

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
				className={`flex gap-3 py-0.75 text-[13px]${changed ? ' animate-[prop-flash_0.7s_ease-out]' : ''}`}
			>
				<span className="text-muted min-w-20 shrink-0">{key}</span>
				{valueNode}
			</div>
		);
	};

	return (
		<div className="bg-elevated border border-edge rounded-md overflow-hidden mb-4">
			<div className="text-[11px] text-dim px-3 py-1.5 border-b border-edge bg-raised flex items-center justify-between">
				&lt;UserCard&gt;
				<span className="inline-flex items-center gap-1 text-[11px] text-dim px-2 py-0.5 rounded-full border border-edge bg-elevated ml-2" suppressHydrationWarning>
					render #{renderCountRef.current}
				</span>
			</div>
			<div className="p-3">
				{propRow('name', <span className="text-ink break-all">&quot;{name}&quot;</span>)}
				{propRow('age', <span className="text-ink break-all">{age}</span>)}
				{propRow(
					'user',
					<span className="text-purple break-all">
						{'{'}id:{user.id}, role:&quot;{user.role}&quot;{'}'}
					</span>,
				)}
				{propRow(
					'onSave',
					<span className="text-brand break-all">
						[Function: {(onSave as { name?: string }).name || 'anonymous'}]
					</span>,
				)}
			</div>
		</div>
	);
};

type ScenarioInnerProps = {
	scenario: Scenario;
	fixed: boolean;
};

const ScenarioInner = ({ scenario, fixed }: ScenarioInnerProps) => {
	const [parentTick, setParentTick] = useState(0);
	const [nameFlip, setNameFlip] = useState(false);

	const stableUser = useMemo<User>(() => ({ id: 1, role: 'admin' }), []);
	const stableOnSave = useCallback(() => {}, []);

	const unstableUser = useMemo<User>(() => ({ id: 1, role: 'admin' }), [parentTick]);
	const unstableOnSave = useCallback(() => {}, [parentTick]);

	const user = scenario.id === 'inline-object' && !fixed ? unstableUser : stableUser;
	const onSave = scenario.id === 'inline-callback' && !fixed ? unstableOnSave : stableOnSave;
	const name = scenario.id === 'real-change' && nameFlip ? 'Bob' : 'Alice';

	const demoProps = useMemo<DemoProps>(
		() => ({ name, age: 25, user, onSave }),
		[name, user, onSave],
	);

	const { entries, clear } = usePropLog('UserCard', demoProps as Record<string, unknown>);

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
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-5 items-start max-md:grid-cols-1">
				<DemoTarget
					{...demoProps}
					changedKeys={changedKeys}
					latestRenderNumber={latestRenderNumber}
				/>
				<ConsolePanel entries={entries} onClear={clear} />
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
						<div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-error">
							{fixed ? 'The bug (before fix):' : '❌ The bug:'}
						</div>
					)}
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{scenario.codeBreaking}</pre>
					{scenario.canFix && scenario.codeFixed && (
						<>
							<div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ok">
								{fixed ? '✅ The fix (applied):' : '✅ The fix:'}
							</div>
							<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{scenario.codeFixed}</pre>
						</>
					)}
				</div>
			</details>
		</div>
	);
};

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

			<div className="mb-5 flex flex-col gap-2.5">
				<span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.75 rounded-full border w-fit ${
					activeScenario.badge === 'warn'
						? 'border-warn-dim bg-warn-dim text-warn'
						: 'border-ok-dim bg-ok-dim text-ok'
				}`}>
					{activeScenario.badge === 'warn' ? '⚠ unnecessary re-render' : '✓ expected behavior'}
				</span>
				<p className="text-[13px] text-muted max-w-150 leading-[1.7]">{activeScenario.description}</p>
				{activeScenario.canFix && (
					<div className="flex items-center gap-3.5 flex-wrap">
						<Toggle checked={fixed} onChange={setFixed} label="Show fix" />
						{fixed && activeScenario.fixDescription && (
							<span className="text-xs text-ok max-w-120 leading-[1.6]">{activeScenario.fixDescription}</span>
						)}
					</div>
				)}
			</div>

			<ScenarioInner
				key={`${activeId}-${String(fixed)}`}
				scenario={activeScenario}
				fixed={fixed}
			/>

			<details className="border border-edge rounded-[10px] overflow-hidden group mt-2">
				<summary className="px-3.5 py-2.5 cursor-pointer text-xs text-muted bg-raised border-b border-transparent group-open:border-b-edge hover:text-ink select-none list-none flex items-center gap-1.5 transition-colors">
					<span className="text-[10px] transition-transform inline-block mr-1 group-open:rotate-90">▸</span>
					How to add this to your component
				</summary>
				<div className="p-3.5 flex flex-col gap-2.5">
					<pre className="bg-elevated border border-edge rounded-md px-3.5 py-3 text-xs leading-[1.7] overflow-x-auto whitespace-pre">{`import { useWhyRender } from '@sapanmozammel/why-render';

const UserCard = (props: UserCardProps) => {
  useWhyRender('UserCard', props);
  // rest of your component...
};`}</pre>
					<p className="text-xs text-dim leading-[1.6]">
						No-op in production. Open DevTools console to see output alongside this panel.
					</p>
				</div>
			</details>
		</>
	);
};
