import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Geist_Mono } from 'next/font/google';
import { BASE_URL } from '@/lib/constants';
import './globals.css';

const geistMono = Geist_Mono({
	subsets: ['latin'],
	variable: '--font-geist-mono',
});

export const metadata: Metadata = {
	metadataBase: new URL(BASE_URL),
	title: { default: 'react-render-kit', template: '%s — react-render-kit' },
	description: 'React Render Observability SDK. 12 dev-only packages for tracing renders, detecting prop instability, time-travel replay, and static analysis. Zero production cost.',
	keywords: ['react', 'render', 'debugging', 'performance', 'hooks', 'observability', 'react devtools', 'render tracing', 'prop diffing', 'react memo', 'render replay', 'react performance'],
	authors: [{ name: 'Sapan Mozammel', url: 'https://github.com/sapanmozammel' }],
	creator: 'Sapan Mozammel',
	openGraph: {
		type: 'website',
		url: BASE_URL,
		siteName: 'react-render-kit',
		title: 'react-render-kit — React Render Observability SDK',
		description: '12 dev-only packages for tracing renders, detecting prop instability, time-travel replay, and static analysis.',
		images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'react-render-kit' }],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'react-render-kit — React Render Observability SDK',
		description: '12 dev-only packages for tracing renders, detecting prop instability, time-travel replay, and static analysis.',
		images: ['/twitter-image'],
		creator: '@sapanmozammel',
	},
	robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

export const viewport: Viewport = {
	themeColor: '#5a9cf8',
	colorScheme: 'dark',
};

type Props = { children: ReactNode };

const RootLayout = ({ children }: Props) => (
	<html lang='en' className={geistMono.variable}>
		<body className='bg-canvas text-ink font-mono min-h-screen antialiased leading-relaxed'>
			<header className='sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-canvas' style={{ height: 52, padding: '0 24px' }}>
				{/* Logo */}
				<Link href='/' className='flex items-center gap-2 text-ink font-semibold text-sm tracking-tight no-underline hover:no-underline' style={{ letterSpacing: '-0.02em' }}>
					{/* Geometric "r" mark — stem + circle head + concave cutout */}
					<svg viewBox='0 0 22 22' width='22' height='22' fill='none' aria-hidden='true' className='shrink-0'>
						<rect width='22' height='22' rx='6' fill='#1a3a6a' />
						<rect x='3' y='5.5' width='8' height='2.5' rx='1.25' fill='#5a9cf8' />
						<rect x='5' y='9.75' width='11' height='2.5' rx='1.25' fill='#4ade80' />
						<rect x='7' y='14' width='6' height='2.5' rx='1.25' fill='#5a9cf8' fillOpacity='0.6' />
					</svg>
					<span>
						react-render-<span className='text-brand'>kit</span>
					</span>
				</Link>

				{/* Nav */}
				<nav className='flex items-center gap-5'>
					<Link href='/docs' className='text-muted text-[13px] hover:text-ink transition-colors no-underline hover:no-underline'>
						Docs
					</Link>
					<a
						href='https://github.com/sapanmozammel/react-render-kit'
						target='_blank'
						rel='noopener noreferrer'
						className='text-muted text-[13px] hover:text-ink transition-colors no-underline hover:no-underline'
					>
						GitHub
					</a>
				</nav>
			</header>

			<main className='max-w-[1100px] mx-auto px-6 pt-10 pb-20'>{children}</main>
		</body>
	</html>
);

export default RootLayout;
