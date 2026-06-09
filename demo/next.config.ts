import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	transpilePackages: ['@sapanmozammel/why-render', '@sapanmozammel/why-render-frequency', '@sapanmozammel/render-trace'],
};

export default nextConfig;
