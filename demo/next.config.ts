import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	transpilePackages: ['why-render'],
	webpack(config) {
		config.resolve.alias = {
			...config.resolve.alias,
			'why-render': path.resolve(__dirname, '../packages/why-render/src/index.ts'),
		};
		return config;
	},
};

export default nextConfig;
