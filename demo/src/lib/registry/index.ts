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
];

export const getToolBySlug = (slug: string): ToolMeta | undefined =>
	TOOLS.find((t) => t.slug === slug);
