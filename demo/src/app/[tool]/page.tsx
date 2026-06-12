import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TOOLS, getToolBySlug } from '@/lib/registry';
import { BASE_URL } from '@/lib/constants';

type Props = { params: Promise<{ tool: string }> };

export const generateStaticParams = () => TOOLS.map(({ slug }) => ({ tool: slug }));

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
	const { tool: slug } = await params;
	const meta = getToolBySlug(slug);
	if (!meta) return { title: 'Not Found' };
	const title = `${meta.name} — react-render-kit`;
	const url = `${BASE_URL}/${slug}`;
	return {
		title,
		description: meta.description,
		openGraph: {
			type: 'website',
			url,
			title,
			description: meta.description,
			images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: title }],
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description: meta.description,
			images: ['/twitter-image'],
		},
	};
};

const ToolPage = async ({ params }: Props) => {
	const { tool: slug } = await params;
	const meta = getToolBySlug(slug);
	if (!meta) notFound();

	const Demo = dynamic(meta.demoImport, {
		loading: () => <div className="p-6 text-muted">Loading demo…</div>,
	});

	return (
		<>
			{/* Back */}
			<Link
				href="/"
				className="inline-flex items-center gap-1.5 text-[13px] text-muted mb-7 hover:text-ink transition-colors no-underline hover:no-underline"
			>
				← All tools
			</Link>

			{/* Page header */}
			<header className="mb-9 pb-7 border-b border-edge">
				<h1
					className="font-bold text-ink mb-2 flex items-center gap-2.5"
					style={{ fontSize: 26, letterSpacing: '-0.02em' }}
				>
					{meta.name}
					<span
						className={`text-[11px] font-medium px-[9px] py-[3px] rounded-full border ${
							meta.status === 'stable'
								? 'text-ok border-ok-dim bg-ok-dim'
								: 'text-warn border-warn-dim bg-warn-dim'
						}`}
					>
						{meta.status}
					</span>
				</h1>
				<p className="text-[14px] text-muted max-w-[580px] leading-relaxed mb-3">
					{meta.description}
				</p>
				<p className="text-[13px] text-dim">
					Install:{' '}
					<code className="text-[12px] bg-raised px-1.5 py-0.5 rounded text-ink">
						{`pnpm add ${meta.packageName}`}
					</code>
				</p>
			</header>

			<Demo />
		</>
	);
};

export default ToolPage;
