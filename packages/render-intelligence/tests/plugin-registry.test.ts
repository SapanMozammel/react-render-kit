import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executePlugins, createPlugin } from '../src/plugins/plugin-registry.js';
import { resetSeq, makeRenderEvent, makeSessionData } from './helpers.js';
import type { AnalysisPlugin, AnalysisContext } from '../src/types/index.js';

beforeEach(() => resetSeq());

const makeContext = (): AnalysisContext => ({
	source: { type: 'events', events: [makeRenderEvent()] },
	components: [],
	health: {
		score: 80,
		grade: 'GOOD',
		componentCount: 1,
		healthyCount: 1,
		degradedCount: 0,
		criticalCount: 0,
		totalRenders: 10,
		analysisSource: 'events',
	},
	correlations: [],
});

describe('executePlugins', () => {
	it('returns empty result for empty plugins array', () => {
		const result = executePlugins([], makeContext());
		expect(result.bottlenecks).toHaveLength(0);
		expect(result.rootCauses).toHaveLength(0);
		expect(result.recommendations).toHaveLength(0);
		expect(result.correlations).toHaveLength(0);
	});

	it('merges results from multiple plugins', () => {
		const pluginA: AnalysisPlugin = {
			id: 'a',
			name: 'Plugin A',
			version: '1.0.0',
			analyze: () => ({ bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] }),
		};
		const pluginB: AnalysisPlugin = {
			id: 'b',
			name: 'Plugin B',
			version: '1.0.0',
			analyze: () => ({ bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] }),
		};
		const result = executePlugins([pluginA, pluginB], makeContext());
		expect(result).toBeDefined();
	});

	it('skips plugins with empty id', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const plugin: AnalysisPlugin = {
			id: '',
			name: 'Invalid',
			version: '1.0.0',
			analyze: vi.fn(() => ({ bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] })),
		};
		executePlugins([plugin], makeContext());
		expect(plugin.analyze).not.toHaveBeenCalled();
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('skips plugins with whitespace-only id', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const plugin: AnalysisPlugin = {
			id: '   ',
			name: 'Invalid',
			version: '1.0.0',
			analyze: vi.fn(() => ({ bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] })),
		};
		executePlugins([plugin], makeContext());
		expect(plugin.analyze).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('catches plugin errors and continues with remaining plugins', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const throwingPlugin: AnalysisPlugin = {
			id: 'throwing',
			name: 'Thrower',
			version: '1.0.0',
			analyze: () => { throw new Error('plugin boom'); },
		};
		const goodPlugin: AnalysisPlugin = {
			id: 'good',
			name: 'Good',
			version: '1.0.0',
			analyze: () => ({ bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] }),
		};
		expect(() => executePlugins([throwingPlugin, goodPlugin], makeContext())).not.toThrow();
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('merges bottlenecks from all plugins', () => {
		const mockBottleneck = {
			rank: 1,
			componentName: 'X',
			category: 'no-change-renders' as const,
			impactScore: 50,
			description: 'test',
			evidence: [],
		};
		const plugin: AnalysisPlugin = {
			id: 'p1',
			name: 'P1',
			version: '1.0.0',
			analyze: () => ({ bottlenecks: [mockBottleneck], rootCauses: [], recommendations: [], correlations: [] }),
		};
		const result = executePlugins([plugin], makeContext());
		expect(result.bottlenecks).toHaveLength(1);
		expect(result.bottlenecks![0]!.componentName).toBe('X');
	});
});

describe('createPlugin', () => {
	it('returns a plugin with the provided definition', () => {
		const def: AnalysisPlugin = {
			id: 'my-plugin',
			name: 'My Plugin',
			version: '2.0.0',
			analyze: () => ({ bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] }),
		};
		const plugin = createPlugin(def);
		expect(plugin.id).toBe('my-plugin');
		expect(plugin.name).toBe('My Plugin');
		expect(plugin.version).toBe('2.0.0');
	});
});
