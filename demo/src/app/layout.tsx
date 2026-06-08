import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
	title: 'react-render-kit',
	description: 'A collection of React debugging and render-analysis utilities',
};

type Props = {
	children: ReactNode;
};

const RootLayout = ({ children }: Props) => (
	<html lang="en">
		<body>
			<header className="site-header">
				<Link href="/" className="site-header__logo">
					react-render-<span>kit</span>
				</Link>
				<nav className="site-header__links">
					<a
						href="https://github.com/sapanmozammel/react-render-kit"
						target="_blank"
						rel="noopener noreferrer"
					>
						GitHub
					</a>
				</nav>
			</header>
			<main className="page-main">{children}</main>
		</body>
	</html>
);

export default RootLayout;
