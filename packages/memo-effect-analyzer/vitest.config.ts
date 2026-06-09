import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: false,
		include: ['tests/**/*.{test,spec}.{ts,tsx}'],
		env: { NODE_ENV: 'development' },
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/**/*.d.ts', 'src/index.ts'],
		},
	},
});
