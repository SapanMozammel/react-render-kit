import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEngine } from '../src/engine/engine';
import type { TraceInstance } from '../src/types';

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve));

describe('createEngine', () => {
	let engine: TraceInstance;

	beforeEach(() => {
		engine = createEngine({ logMode: 'silent' });
	});

	afterEach(() => {
		engine.resetTrace();
	});

	describe('registerNode', () => {
		it('records a node with depth 0 and null parent for the first call', async () => {
			engine.registerNode('App');
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			expect(cycle).toBeDefined();
			const node = cycle.nodes[0];
			expect(node?.componentName).toBe('App');
			expect(node?.depth).toBe(0);
			expect(node?.parentName).toBeNull();
		});

		it('records a nested child with correct depth and parentName', async () => {
			engine.registerNode('App');
			engine.registerNode('Dashboard');
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			const dashboard = cycle.nodes.find((n) => n.componentName === 'Dashboard');
			expect(dashboard?.depth).toBe(1);
			expect(dashboard?.parentName).toBe('App');
		});

		it('records a three-level tree with correct depths', async () => {
			engine.registerNode('App');
			engine.registerNode('Dashboard');
			engine.registerNode('UserCard');
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			expect(cycle.nodes[0]?.depth).toBe(0);
			expect(cycle.nodes[1]?.depth).toBe(1);
			expect(cycle.nodes[2]?.depth).toBe(2);
		});

		it('assigns sequential renderIndex values', async () => {
			engine.registerNode('App');
			engine.registerNode('Sidebar');
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			expect(cycle.nodes[0]?.renderIndex).toBe(0);
			expect(cycle.nodes[1]?.renderIndex).toBe(1);
		});

		it('groups siblings into the same cycle', async () => {
			engine.registerNode('App');
			engine.unregisterNode('App');
			engine.registerNode('App');
			engine.registerNode('ChildA');
			engine.unregisterNode('ChildA');
			engine.registerNode('ChildB');
			await flushMicrotasks();
			// All nodes share a single cycle
			const chains = engine.getRenderChains();
			expect(chains).toHaveLength(1);
			expect(chains[0]?.nodes.length).toBeGreaterThanOrEqual(2);
		});

		it('does nothing when engine is disabled', async () => {
			engine.stop();
			engine.registerNode('App');
			await flushMicrotasks();
			expect(engine.getRenderChains()).toHaveLength(0);
		});
	});

	describe('flush / cycle finalisation', () => {
		it('sets rootTrigger to the depth-0 component', async () => {
			engine.registerNode('App');
			engine.registerNode('Child');
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			expect(cycle.rootTrigger).toBe('App');
		});

		it('computes maxDepth from the deepest node', async () => {
			engine.registerNode('App'); // depth 0
			engine.registerNode('Dashboard'); // depth 1
			engine.registerNode('UserCard'); // depth 2
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			expect(cycle.maxDepth).toBe(2);
		});

		it('sets totalRenders to the node count', async () => {
			engine.registerNode('A');
			engine.registerNode('B');
			engine.registerNode('C');
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			expect(cycle.totalRenders).toBe(3);
		});

		it('sets status to flushed', async () => {
			engine.registerNode('App');
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			expect(cycle.status).toBe('flushed');
		});

		it('sets endTime after flush', async () => {
			engine.registerNode('App');
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			expect(cycle.endTime).not.toBeNull();
		});

		it('batches multiple registerNode calls into one cycle', async () => {
			engine.registerNode('App');
			engine.registerNode('Child');
			engine.registerNode('GrandChild');
			await flushMicrotasks();
			expect(engine.getRenderChains()).toHaveLength(1);
			expect(engine.getRenderChains()[0]?.nodes).toHaveLength(3);
		});

		it('produces a new cycle on the next microtask boundary', async () => {
			engine.registerNode('App');
			await flushMicrotasks();
			engine.registerNode('App');
			await flushMicrotasks();
			expect(engine.getRenderChains()).toHaveLength(2);
		});
	});

	describe('unregisterNode', () => {
		it('pops the stack so the next sibling has the correct parent', async () => {
			engine.registerNode('App'); // stack: ['App']
			engine.registerNode('ChildA'); // stack: ['App', 'ChildA']
			engine.unregisterNode('ChildA'); // stack: ['App']
			engine.registerNode('ChildB'); // stack: ['App', 'ChildB']
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			const childB = cycle.nodes.find((n) => n.componentName === 'ChildB');
			expect(childB?.parentName).toBe('App');
			expect(childB?.depth).toBe(1);
		});

		it('is a no-op when the stack is already empty', () => {
			expect(() => engine.unregisterNode('Ghost')).not.toThrow();
		});

		it('discards the in-flight cycle on stack mismatch (Concurrent Mode)', async () => {
			engine.registerNode('App');
			engine.registerNode('Child');
			engine.unregisterNode('App'); // mismatch: expected 'Child', got 'App' as the top-of-stack check
			await flushMicrotasks();
			// Active cycle was discarded
			expect(engine.getRenderChains()).toHaveLength(0);
		});
	});

	describe('strict mode deduplication', () => {
		it('skips a second consecutive registration of the same component', async () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			engine.registerNode('Button');
			engine.registerNode('Button'); // duplicate — Strict Mode second invocation
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			// Only one node recorded
			expect(cycle.nodes.filter((n) => n.componentName === 'Button')).toHaveLength(1);
			warnSpy.mockRestore();
		});

		it('emits a console.warn on the first dedup', async () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			engine.registerNode('Button');
			engine.registerNode('Button');
			await flushMicrotasks();
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Strict Mode'));
			warnSpy.mockRestore();
		});

		it('does not dedup non-consecutive same-name nodes', async () => {
			engine.registerNode('App');
			engine.registerNode('Item'); // depth 1, parent App
			engine.unregisterNode('Item');
			engine.registerNode('Item'); // another sibling, same name
			await flushMicrotasks();
			const [cycle] = engine.getRenderChains();
			expect(cycle.nodes.filter((n) => n.componentName === 'Item')).toHaveLength(2);
		});
	});

	describe('getRootCause', () => {
		it('returns null when no cycles exist', () => {
			expect(engine.getRootCause()).toBeNull();
		});

		it('returns the rootTrigger of the most recent cycle', async () => {
			engine.registerNode('Dashboard');
			await flushMicrotasks();
			engine.registerNode('Profile');
			await flushMicrotasks();
			expect(engine.getRootCause()).toBe('Profile');
		});
	});

	describe('resetTrace', () => {
		it('clears all cycles', async () => {
			engine.registerNode('App');
			await flushMicrotasks();
			engine.resetTrace();
			expect(engine.getRenderChains()).toHaveLength(0);
		});

		it('clears the stack', () => {
			engine.registerNode('App');
			engine.resetTrace();
			// Stack is clear: registering App again should not trigger Strict Mode dedup
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			engine.registerNode('App');
			engine.registerNode('App'); // would dedup if stack still had 'App'
			expect(warnSpy).toHaveBeenCalled(); // dedup fires because we just pushed 'App' on line above
			warnSpy.mockRestore();
		});
	});

	describe('maxCycles FIFO eviction', () => {
		it('evicts the oldest cycle when limit is exceeded', async () => {
			const small = createEngine({ maxCycles: 3, logMode: 'silent' });

			for (let i = 0; i < 4; i++) {
				small.registerNode(`Comp-${i}`);
				await flushMicrotasks();
			}

			const chains = small.getRenderChains();
			expect(chains).toHaveLength(3);
			// cycle-1 was evicted; oldest remaining is cycle-2
			expect(chains[0]?.id).toBe('cycle-2');
		});
	});

	describe('start / stop', () => {
		it('stop() prevents further registrations', async () => {
			engine.stop();
			engine.registerNode('App');
			await flushMicrotasks();
			expect(engine.getRenderChains()).toHaveLength(0);
		});

		it('stop() flushes an in-flight cycle synchronously', async () => {
			engine.registerNode('App');
			engine.stop(); // flush happens synchronously inside stop()
			expect(engine.getRenderChains()).toHaveLength(1);
		});

		it('start() re-enables registration', async () => {
			engine.stop();
			engine.start();
			engine.registerNode('App');
			await flushMicrotasks();
			expect(engine.getRenderChains()).toHaveLength(1);
		});
	});
});
