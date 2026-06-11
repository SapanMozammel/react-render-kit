import type { ComponentType } from 'react';

export type ToolStatus = 'stable' | 'beta' | 'experimental';

export type ToolMeta = {
	readonly name: string;
	readonly slug: string;
	readonly description: string;
	readonly packageName: string;
	readonly version: string;
	readonly tags: readonly string[];
	readonly status: ToolStatus;
	readonly demoImport: () => Promise<{ default: ComponentType }>;
};

export const TOOLS: readonly ToolMeta[] = [
	{
		name: 'why-render',
		slug: 'why-render',
		description:
			'Debug why React components re-render by diffing props between renders. Logs primitive changes, object reference churn, and added/removed props.',
		packageName: '@sapanmozammel/why-render',
		version: '1.0.0',
		tags: ['debugging', 'performance', 'hooks'],
		status: 'stable',
		demoImport: () => import('@/features/why-render').then((m) => ({ default: m.WhyRenderDemo })),
	},
	{
		name: 'why-render-frequency',
		slug: 'why-render-frequency',
		description:
			'Track how often React components re-render. Logs total count, rolling-window rate, and observation (Low / Moderate / High). Dev-only, zero production cost.',
		packageName: '@sapanmozammel/why-render-frequency',
		version: '1.0.0',
		tags: ['debugging', 'performance', 'hooks'],
		status: 'stable',
		demoImport: () =>
			import('@/features/why-render-frequency').then((m) => ({ default: m.WhyRenderFrequencyDemo })),
	},
	{
		name: 'render-trace',
		slug: 'render-trace',
		description:
			'Trace React render propagation — see which component triggered a cascade, how deep it went, and which components were dragged along. Dev-only, zero production cost.',
		packageName: '@sapanmozammel/render-trace',
		version: '1.0.0',
		tags: ['debugging', 'performance', 'hooks'],
		status: 'stable',
		demoImport: () =>
			import('@/features/render-trace').then((m) => ({ default: m.RenderTraceDemo })),
	},
	{
		name: 'unstable-props-detector',
		slug: 'unstable-props-detector',
		description:
			'Detect props whose reference identity changes between renders — functions, objects, and arrays that silently defeat React.memo optimizations. Dev-only, zero production cost.',
		packageName: '@sapanmozammel/unstable-props-detector',
		version: '1.0.0',
		tags: ['debugging', 'performance', 'hooks'],
		status: 'stable',
		demoImport: () =>
			import('@/features/unstable-props-detector').then((m) => ({ default: m.UnstablePropsDetectorDemo })),
	},
	{
		name: 'memo-effect-analyzer',
		slug: 'memo-effect-analyzer',
		description:
			'Classify the effectiveness of React.memo optimizations by analyzing prop change history — distinguish genuine data changes from reference instability and get a session verdict. Dev-only, zero production cost.',
		packageName: '@sapanmozammel/memo-effect-analyzer',
		version: '1.0.0',
		tags: ['debugging', 'performance', 'hooks'],
		status: 'stable',
		demoImport: () =>
			import('@/features/memo-effect-analyzer').then((m) => ({ default: m.MemoEffectAnalyzerDemo })),
	},
	{
		name: 'render-insights',
		slug: 'render-insights',
		description:
			'Unified render diagnostics — correlates prop changes, frequency, unstable references, and memo effectiveness into a single scored report with actionable recommendations. Dev-only, zero production cost.',
		packageName: '@sapanmozammel/render-insights',
		version: '1.0.0',
		tags: ['debugging', 'performance', 'hooks'],
		status: 'stable',
		demoImport: () =>
			import('@/features/render-insights').then((m) => ({ default: m.RenderInsightsDemo })),
	},
	{
		name: 'render-playground',
		slug: 'render-playground',
		description:
			'Visual render observatory — a self-contained dev panel that renders inline next to your component, displaying score, prop diffs, timeline, memo classification, frequency, and structured recommendations in real time.',
		packageName: '@sapanmozammel/render-playground',
		version: '1.0.0',
		tags: ['debugging', 'performance', 'hooks', 'ui'],
		status: 'stable',
		demoImport: () =>
			import('@/features/render-playground').then((m) => ({ default: m.RenderPlaygroundDemo })),
	},
	{
		name: 'render-telemetry-core',
		slug: 'render-telemetry-core',
		description:
			'Typed event protocol and observability infrastructure — emit structured telemetry events from any React component, buffer them with useSyncExternalStore, and pipe them to custom transports. Zero dependencies, no React peer dep.',
		packageName: '@sapanmozammel/render-telemetry-core',
		version: '1.0.0',
		tags: ['debugging', 'performance', 'infrastructure', 'protocol'],
		status: 'stable',
		demoImport: () =>
			import('@/features/render-telemetry-core').then((m) => ({ default: m.RenderTelemetryCoreDemo })),
	},
	{
		name: 'render-replay-engine',
		slug: 'render-replay-engine',
		description:
			'Pure TypeScript replay engine for render telemetry — navigate recorded render sessions frame-by-frame with immutable cursors, filter by preset, bookmark frames, and inspect prop diffs without any React dependency.',
		packageName: '@sapanmozammel/render-replay-engine',
		version: '1.0.0',
		tags: ['debugging', 'performance', 'infrastructure', 'replay'],
		status: 'stable',
		demoImport: () =>
			import('@/features/render-replay-engine').then((m) => ({ default: m.RenderReplayEngineDemo })),
	},
	{
		name: 'render-core-schema',
		slug: 'render-core-schema',
		description:
			'Canonical TypeScript schema and protocol definitions for the react-render-kit ecosystem — one shared vocabulary for all packages. Zero deps, zero runtime coupling. Includes type guards and version utilities for boundary validation.',
		packageName: '@sapanmozammel/render-core-schema',
		version: '1.0.0',
		tags: ['types', 'schema', 'protocol', 'infrastructure'],
		status: 'stable',
		demoImport: () =>
			import('@/features/render-core-schema').then((m) => ({ default: m.RenderCoreSchemaDemo })),
	},
	{
		name: 'render-intelligence',
		slug: 'render-intelligence',
		description:
			'Post-hoc analysis engine for React render telemetry — ranks performance bottlenecks, traces root causes, detects cross-component correlations, and generates 15 deterministic recommendations. Framework-agnostic, zero runtime dependencies.',
		packageName: '@sapanmozammel/render-intelligence',
		version: '1.0.0',
		tags: ['analysis', 'performance', 'intelligence', 'infrastructure'],
		status: 'stable',
		demoImport: () =>
			import('@/features/render-intelligence').then((m) => ({ default: m.RenderIntelligenceDemo })),
	},
];

export const getToolBySlug = (slug: string): ToolMeta | undefined =>
	TOOLS.find((t) => t.slug === slug);
