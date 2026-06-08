import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	...(process.env.CI ? { workers: 1 } : {}),
	reporter: process.env.CI ? 'github' : 'html',
	use: {
		trace: 'on-first-retry',
		// Stable assertions — reduced motion settles animations instantly
		contextOptions: {
			reducedMotion: 'reduce',
		},
	},
	projects: [
		{
			name: 'chromium-desktop',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
