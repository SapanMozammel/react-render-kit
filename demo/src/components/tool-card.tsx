import Link from 'next/link';
import type { ToolMeta } from '@/lib/registry';

type Props = {
	tool: ToolMeta;
};

const ToolCard = ({ tool }: Props) => (
	<Link href={`/${tool.slug}`} className="tool-card">
		<div className="tool-card__header">
			<span className="tool-card__name">{tool.name}</span>
			<span className="tool-card__version">v{tool.version}</span>
		</div>
		<p className="tool-card__description">{tool.description}</p>
		<div className="tool-card__tags">
			{tool.tags.map((tag) => (
				<span key={tag} className="tag">
					{tag}
				</span>
			))}
		</div>
		<span className="tool-card__cta">Open demo →</span>
	</Link>
);

export default ToolCard;
