import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => ({
	name: 'react-render-kit',
	short_name: 'render-kit',
	description:
		'React Render Observability SDK — 12 packages for tracing renders, detecting prop instability, time-travel replay, and static analysis.',
	start_url: '/',
	display: 'standalone',
	background_color: '#111111',
	theme_color: '#5a9cf8',
	icons: [
		{
			src: '/icon.svg',
			sizes: 'any',
			type: 'image/svg+xml',
			purpose: 'any',
		},
	],
});

export default manifest;
