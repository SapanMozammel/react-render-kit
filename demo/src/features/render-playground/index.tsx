'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	PlaygroundProvider,
	RenderPlaygroundPanel,
	useRenderPlayground,
} from '@sapanmozammel/render-playground';
import { SCENARIOS, type Scenario, type ScenarioId } from './scenarios';

// ── Target component ───────────────────────────────────────────────────────

type DashboardProps = {
	title: string;
	onClick: () => void;
	onHover?: () => void;
	config: { theme: string; density?: string };
	tags?: string[];
};

const Dashboard = memo(({ title, onClick, onHover, config, tags }: DashboardProps) => {
	useRenderPlayground('Dashboard', { title, onClick, onHover, config, tags });
	return (
		<div
			style={{
				padding: '16px',
				border: '1px solid #3a3a3a',
				borderRadius: '6px',
				backgroundColor: '#1a1a1a',
				color: '#ededed',
				fontFamily: 'ui-monospace, monospace',
				fontSize: '13px',
				minWidth: '200px',
			}}
		>
			<div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>
				[Target Component] &lt;Dashboard&gt;
			</div>
			<div>
				<span style={{ color: '#888' }}>title: </span>
				<span style={{ color: '#60a5fa' }}>{title}</span>
			</div>
			<div>
				<span style={{ color: '#888' }}>config.theme: </span>
				<span>{config.theme}</span>
			</div>
			{tags && (
				<div>
					<span style={{ color: '#888' }}>tags: </span>
					<span>[{tags.join(', ')}]</span>
				</div>
			)}
		</div>
	);
});

// ── Scenario runner ────────────────────────────────────────────────────────

type RunnerProps = {
	scenario: Scenario;
};

const ScenarioRunner = ({ scenario }: RunnerProps) => {
	const [tick, setTick] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Stop interval when scenario changes
	useEffect(() => {
		return () => {
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [scenario.id]);

	const trigger = () => {
		if (scenario.id === 'high-frequency') {
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
				return;
			}
			intervalRef.current = setInterval(() => setTick((t) => t + 1), 80);
			return;
		}
		setTick((t) => t + 1);
	};

	// ── Well optimized — stable refs ──────────────────────────────────────
	const stableOnClick = useCallback(() => {}, []);
	const stableOnHover = useCallback(() => {}, []);
	const stableConfig = useMemo(() => ({ theme: 'dark' }), []);
	const stableTags = useMemo(() => ['admin', 'user'], []);

	// ── Unstable callbacks — inline functions ─────────────────────────────
	const inlineOnClick = () => {};
	const inlineOnHover = () => {};

	// ── Unstable objects ──────────────────────────────────────────────────
	const inlineConfig = { theme: 'dark', density: 'compact' };
	const inlineTags = ['admin', 'power-user'];

	const getProps = () => {
		switch (scenario.id) {
			case 'well-optimized':
				return {
					title: `data-${tick}`,
					onClick: stableOnClick,
					onHover: stableOnHover,
					config: stableConfig,
					tags: stableTags,
				};
			case 'unstable-callbacks':
				return {
					title: 'static',
					onClick: inlineOnClick,
					onHover: inlineOnHover,
					config: stableConfig,
				};
			case 'unstable-objects':
				return {
					title: 'static',
					onClick: stableOnClick,
					config: inlineConfig,
					tags: inlineTags,
				};
			case 'memo-defeated':
				return {
					title: 'static',
					onClick: inlineOnClick,
					config: inlineConfig,
					tags: inlineTags,
				};
			case 'high-frequency':
				return {
					title: `tick-${tick}`,
					onClick: stableOnClick,
					config: stableConfig,
				};
		}
	};

	const props = getProps();

	const isRunning = scenario.id === 'high-frequency' && intervalRef.current !== null;

	return (
		<div
			style={{
				display: 'flex',
				gap: '20px',
				alignItems: 'flex-start',
				flexWrap: 'wrap',
			}}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
				<Dashboard {...props} />
				<button
					onClick={trigger}
					style={{
						padding: '6px 14px',
						backgroundColor: isRunning ? '#7f1d1d' : '#1e3a5f',
						border: '1px solid #3a3a3a',
						borderRadius: '4px',
						color: '#ededed',
						cursor: 'pointer',
						fontFamily: 'ui-monospace, monospace',
						fontSize: '12px',
					}}
				>
					{isRunning ? 'Stop' : scenario.triggerLabel}
				</button>
			</div>
			<RenderPlaygroundPanel />
		</div>
	);
};

// ── Demo root ──────────────────────────────────────────────────────────────

export const RenderPlaygroundDemo = () => {
	const [activeId, setActiveId] = useState<ScenarioId>('well-optimized');
	const activeScenario = SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0]!;

	return (
		<div
			style={{
				backgroundColor: '#141414',
				color: '#ededed',
				fontFamily: 'ui-monospace, monospace',
				fontSize: '13px',
				padding: '20px',
				borderRadius: '8px',
			}}
		>
			{/* Scenario picker */}
			<div style={{ marginBottom: '16px' }}>
				<div
					style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}
				>
					Scenario
				</div>
				<div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
					{SCENARIOS.map((s) => (
						<button
							key={s.id}
							onClick={() => setActiveId(s.id)}
							style={{
								padding: '4px 10px',
								borderRadius: '4px',
								border: `1px solid ${activeId === s.id ? '#60a5fa' : '#3a3a3a'}`,
								backgroundColor: activeId === s.id ? '#1e3a5f' : 'transparent',
								color: activeId === s.id ? '#60a5fa' : '#888',
								cursor: 'pointer',
								fontFamily: 'ui-monospace, monospace',
								fontSize: '11px',
							}}
						>
							{s.badge === 'warn' ? '⚠ ' : '✓ '}
							{s.label}
						</button>
					))}
				</div>
				<p
					style={{
						margin: '8px 0 0',
						color: '#888',
						fontSize: '11px',
						lineHeight: '1.5',
						maxWidth: '600px',
					}}
				>
					{activeScenario.description}
				</p>
			</div>

			{/* Re-mount on scenario change to reset store */}
			<PlaygroundProvider key={activeId}>
				<ScenarioRunner scenario={activeScenario} />
			</PlaygroundProvider>
		</div>
	);
};
