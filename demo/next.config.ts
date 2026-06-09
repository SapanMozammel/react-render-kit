import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	transpilePackages: ['@sapanmozammel/why-render', '@sapanmozammel/why-render-frequency', '@sapanmozammel/render-trace', '@sapanmozammel/unstable-props-detector', '@sapanmozammel/memo-effect-analyzer'],
};

export default nextConfig;
