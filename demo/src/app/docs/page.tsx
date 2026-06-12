import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Docs',
	description: 'Documentation for the react-render-kit observability SDK — all 12 packages.',
};

type DocEntry = {
	readonly slug: string;
	readonly title: string;
	readonly description: string;
	readonly group: 'start' | 'packages' | 'infrastructure';
};

const DOCS: readonly DocEntry[] = [
	{
		slug: 'introduction',
		title: 'Introduction',
		group: 'start',
		description:
			'Overview of react-render-kit — what it does, why it exists, and how the 12 packages fit together.',
	},
	{
		slug: 'getting-started',
		title: 'Getting Started',
		group: 'start',
		description:
			'Install the unified SDK or individual packages and instrument your first component in under 5 minutes.',
	},
	{
		slug: 'architecture',
		title: 'Architecture',
		group: 'start',
		description:
			'How the 12 packages are layered — from schema and telemetry through replay, intelligence, and the kit facade.',
	},
	{
		slug: 'faq',
		title: 'FAQ',
		group: 'start',
		description:
			'Common questions about production safety, Next.js compatibility, memory usage, and plugin authoring.',
	},
	{
		slug: 'render-kit',
		title: 'render-kit',
		group: 'packages',
		description:
			'The unified SDK — createRenderKit(), RenderKitProvider, full config reference, and disabled mode.',
	},
	{
		slug: 'playground',
		title: 'render-playground',
		group: 'packages',
		description:
			'Visual in-app render observatory with score gauge, prop diff table, timeline, and recommendations.',
	},
	{
		slug: 'why-render',
		title: 'why-render',
		group: 'packages',
		description:
			'useWhyRender hook — diff previous vs current props and log exactly what changed and why.',
	},
	{
		slug: 'unstable-props-detector',
		title: 'unstable-props-detector',
		group: 'packages',
		description:
			'Detect object, array, and function props recreated every render, silently defeating React.memo.',
	},
	{
		slug: 'memo-effect-analyzer',
		title: 'memo-effect-analyzer',
		group: 'packages',
		description:
			'Session-level React.memo effectiveness classification: EFFECTIVE, INEFFECTIVE, PARTIALLY_EFFECTIVE.',
	},
	{
		slug: 'render-trace',
		title: 'render-trace',
		group: 'packages',
		description:
			'Trace render cascade propagation — identify root-trigger components and render chain depth.',
	},
	{
		slug: 'telemetry',
		title: 'render-telemetry-core',
		group: 'infrastructure',
		description:
			'Typed event protocol, ring buffer, transport implementations, and buffer serialization.',
	},
	{
		slug: 'replay-engine',
		title: 'render-replay-engine',
		group: 'infrastructure',
		description:
			'Time-travel replay — buildReplaySessions, cursor navigation, 7 filter presets, and bookmarks.',
	},
	{
		slug: 'intelligence',
		title: 'render-intelligence',
		group: 'infrastructure',
		description:
			'Cross-component analysis — bottleneck ranking, correlation detection, root cause classification.',
	},
	{
		slug: 'core-schema',
		title: 'render-core-schema',
		group: 'infrastructure',
		description:
			'Canonical TypeScript types, type guards, and schema version utilities for the ecosystem.',
	},
];

const GROUPS = [
	{ key: 'start', label: 'Start here' },
	{ key: 'packages', label: 'Packages' },
	{ key: 'infrastructure', label: 'Infrastructure' },
] as const;

const GITHUB_BASE =
	'https://github.com/sapanmozammel/react-render-kit/blob/main/docs';

const DocsPage = () => (
	<>
		{/* Header */}
		<section className="pt-14 pb-10 border-b border-edge mb-10">
			<Link
				href="/"
				className="inline-flex items-center gap-1.5 text-[13px] text-muted mb-6 hover:text-ink transition-colors no-underline hover:no-underline"
			>
				← Home
			</Link>
			<p className="text-[11px] text-dim uppercase tracking-widest mb-4">react-render-kit</p>
			<h1
				className="font-bold text-ink mb-4"
				style={{ fontSize: 'clamp(24px, 4vw, 36px)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
			>
				Documentation
			</h1>
			<p className="text-[15px] text-muted leading-relaxed max-w-[540px]">
				Guides and API references for all 12 packages. Click any card to read the full doc on
				GitHub.
			</p>
		</section>

		{/* Doc groups */}
		{GROUPS.map(({ key, label }) => {
			const entries = DOCS.filter((d) => d.group === key);
			return (
				<section key={key} className="mb-12">
					<p className="text-[11px] text-dim uppercase tracking-widest mb-5">{label}</p>
					<div
						className="grid gap-3"
						style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
					>
						{entries.map((doc) => (
							<a
								key={doc.slug}
								href={`${GITHUB_BASE}/${doc.slug}.md`}
								target="_blank"
								rel="noopener noreferrer"
								className="block bg-surface border border-edge rounded-[10px] p-5 hover:bg-raised hover:border-edge-active transition-colors no-underline group"
							>
								<div className="flex items-start justify-between gap-2 mb-2">
									<span className="text-[14px] font-semibold text-ink">{doc.title}</span>
									<span className="text-dim text-[12px] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
										↗
									</span>
								</div>
								<p className="text-[12px] text-muted leading-relaxed">{doc.description}</p>
							</a>
						))}
					</div>
				</section>
			);
		})}
	</>
);

export default DocsPage;
