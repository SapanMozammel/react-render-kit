import Link from 'next/link';
import type { ToolMeta } from '@/lib/registry';

type Props = { tool: ToolMeta };

const ToolCard = ({ tool }: Props) => (
	<Link
		href={`/${tool.slug}`}
		className="block bg-surface border border-edge rounded-[10px] p-5 transition-colors hover:bg-raised hover:border-edge-active text-inherit no-underline hover:no-underline"
	>
		{/* Header row */}
		<div className="flex items-center justify-between mb-2">
			<span className="text-[15px] font-semibold text-ink">{tool.name}</span>
			<div className="flex items-center gap-1.5">
				{tool.priority === 'essential' && (
					<span
						className="text-[11px] font-medium text-ok border border-ok/20 bg-ok/[.07] px-[7px] py-0.5 rounded-full"
						style={{ letterSpacing: '0.02em' }}
					>
						essential
					</span>
				)}
				<span className="text-[11px] text-dim bg-elevated border border-edge px-[7px] py-0.5 rounded-full">
					v{tool.version}
				</span>
			</div>
		</div>

		{/* Description */}
		<p className="text-[13px] text-muted leading-relaxed mb-3.5">{tool.description}</p>

		{/* Tags */}
		<div className="flex flex-wrap gap-1.5 mb-3.5">
			{tool.tags.map((tag) => (
				<span
					key={tag}
					className="text-[11px] text-dim bg-elevated border border-edge px-2 py-0.5 rounded-full"
				>
					{tag}
				</span>
			))}
		</div>

		{/* CTA */}
		<span className="text-[12px] text-brand flex items-center gap-1">View demo →</span>
	</Link>
);

export default ToolCard;
