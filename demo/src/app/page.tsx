import Link from 'next/link';
import ToolCard from '@/components/tool-card';
import { TOOLS } from '@/lib/registry';

const HomePage = () => (
	<>
		{/* Hero */}
		<section className="pt-14 pb-12 border-b border-edge mb-12">
			<p className="text-[11px] text-dim uppercase tracking-widest mb-4">react-render-kit</p>
			<h1
				className="font-bold leading-tight mb-5 text-ink"
				style={{ fontSize: 'clamp(28px, 5vw, 44px)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
			>
				React debugging,
				<br />
				<em className="not-italic text-brand">without the ceremony.</em>
			</h1>
			<p className="text-[15px] text-muted leading-relaxed max-w-[520px]">
				Drop-in hooks and utilities that explain exactly what&apos;s happening inside your React
				components. No configuration. No wrapping. One line.
			</p>
			<div className="flex items-center gap-3 mt-7">
				<a
					href="https://github.com/sapanmozammel/react-render-kit"
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-brand-dim text-brand border border-brand/30 hover:bg-brand/20 transition-colors no-underline"
				>
					View on GitHub
				</a>
				<Link
					href="/docs"
					className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted border border-edge hover:border-edge-active hover:text-ink transition-colors no-underline"
				>
					Read the docs
				</Link>
			</div>
		</section>

		{/* Tools grid */}
		<section>
			<p className="text-[11px] text-dim uppercase tracking-widest mb-5">
				Tools ({TOOLS.length})
			</p>
			<div
				className="grid gap-4"
				style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
			>
				{TOOLS.map((tool) => (
					<ToolCard key={tool.slug} tool={tool} />
				))}
			</div>
		</section>
	</>
);

export default HomePage;
