import { defineConfig } from 'tsup';

const SIBLING_PACKAGES = [
	'@sapanmozammel/why-render',
	'@sapanmozammel/why-render-frequency',
	'@sapanmozammel/render-trace',
	'@sapanmozammel/unstable-props-detector',
	'@sapanmozammel/memo-effect-analyzer',
	'@sapanmozammel/render-insights',
	'@sapanmozammel/render-playground',
	'@sapanmozammel/render-telemetry-core',
	'@sapanmozammel/render-replay-engine',
	'@sapanmozammel/render-core-schema',
	'@sapanmozammel/render-intelligence',
];

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	clean: true,
	external: ['react', ...SIBLING_PACKAGES],
	outExtension({ format }) {
		return { js: format === 'cjs' ? '.cjs' : '.mjs' };
	},
});
