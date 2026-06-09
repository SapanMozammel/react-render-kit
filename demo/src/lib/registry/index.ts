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
];

export const getToolBySlug = (slug: string): ToolMeta | undefined =>
	TOOLS.find((t) => t.slug === slug);
