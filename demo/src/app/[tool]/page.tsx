import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TOOLS, getToolBySlug } from '@/lib/registry';

type Props = {
	params: Promise<{ tool: string }>;
};

export const generateStaticParams = () => TOOLS.map(({ slug }) => ({ tool: slug }));

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
	const { tool: slug } = await params;
	const meta = getToolBySlug(slug);
	return {
		title: meta ? `${meta.name} — react-render-kit` : 'Not Found',
		description: meta?.description,
	};
};

const ToolPage = async ({ params }: Props) => {
	const { tool: slug } = await params;
	const meta = getToolBySlug(slug);
	if (!meta) notFound();

	const Demo = dynamic(meta.demoImport, {
		loading: () => <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading demo…</div>,
	});

	return (
		<>
			<Link href="/" className="tool-page__back">
				← All tools
			</Link>

			<header className="tool-page__header">
				<h1 className="tool-page__name">
					{meta.name}
					<span className={`badge badge--${meta.status}`}>{meta.status}</span>
				</h1>
				<p className="tool-page__description">{meta.description}</p>
				<p className="tool-page__install">
					Install: <code>pnpm add {meta.packageName}</code>
				</p>
			</header>

			<Demo />
		</>
	);
};

export default ToolPage;
