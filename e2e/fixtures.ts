import { test as base } from '@playwright/test';

export const test = base.extend({
	// Custom fixtures go here as the demo app grows
});

export { expect } from '@playwright/test';
