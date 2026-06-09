import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logCycle } from '../src/logger/trace-logger';
import type { RenderCycle } from '../src/types';

const makeCycle = (overrides: Partial<RenderCycle> = {}): RenderCycle => ({
  id: 'cycle-1',
  startTime: 1000,
  endTime: 1010,
  nodes: [
    {
      id: 'cycle-1:App:0',
      componentName: 'App',
      cycleId: 'cycle-1',
      depth: 0,
      parentName: null,
      renderIndex: 0,
      timestamp: 1000,
    },
    {
      id: 'cycle-1:Dashboard:1',
      componentName: 'Dashboard',
      cycleId: 'cycle-1',
      depth: 1,
      parentName: 'App',
      renderIndex: 1,
      timestamp: 1001,
    },
  ],
  rootTrigger: 'App',
  maxDepth: 1,
  totalRenders: 2,
  status: 'flushed',
  ...overrides,
});

describe('logCycle', () => {
  let groupSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let groupEndSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('silent mode', () => {
    it('produces no output', () => {
      logCycle(makeCycle(), 'silent');
      expect(groupSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('tree mode', () => {
    it('opens a console group with cycle id and root trigger', () => {
      logCycle(makeCycle(), 'tree');
      expect(groupSpy).toHaveBeenCalledWith(
        expect.stringContaining('cycle-1'),
      );
      expect(groupSpy).toHaveBeenCalledWith(
        expect.stringContaining('<App>'),
      );
    });

    it('logs tree lines with connectors', () => {
      logCycle(makeCycle(), 'tree');
      const calls = logSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.some((l) => l.includes('<App>'))).toBe(true);
      expect(calls.some((l) => l.includes('<Dashboard>'))).toBe(true);
      // Dashboard should be indented (has └── or ├── prefix)
      expect(calls.some((l) => /[└├]/.test(l) && l.includes('<Dashboard>'))).toBe(true);
    });

    it('closes the group', () => {
      logCycle(makeCycle(), 'tree');
      expect(groupEndSpy).toHaveBeenCalled();
    });

    it('includes duration in the header', () => {
      logCycle(makeCycle(), 'tree');
      expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('10ms'));
    });

    it('includes total render count in the header', () => {
      logCycle(makeCycle(), 'tree');
      expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('2 renders'));
    });

    it('warns on multiple disconnected roots (partial instrumentation)', () => {
      const cycle = makeCycle({
        nodes: [
          {
            id: 'c:App:0',
            componentName: 'App',
            cycleId: 'c',
            depth: 0,
            parentName: null,
            renderIndex: 0,
            timestamp: 1,
          },
          {
            id: 'c:Sidebar:1',
            componentName: 'Sidebar',
            cycleId: 'c',
            depth: 0,
            parentName: null,
            renderIndex: 1,
            timestamp: 2,
          },
        ],
        maxDepth: 0,
        totalRenders: 2,
      });
      logCycle(cycle, 'tree');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('disconnected render roots'),
      );
    });
  });

  describe('flat mode', () => {
    it('opens a console group', () => {
      logCycle(makeCycle(), 'flat');
      expect(groupSpy).toHaveBeenCalled();
    });

    it('logs each node with depth info', () => {
      logCycle(makeCycle(), 'flat');
      const calls = logSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.some((l) => l.includes('<App>'))).toBe(true);
      expect(calls.some((l) => l.includes('<Dashboard>'))).toBe(true);
      expect(calls.some((l) => l.includes('depth'))).toBe(true);
    });

    it('shows parent arrow for non-root nodes', () => {
      logCycle(makeCycle(), 'flat');
      const calls = logSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.some((l) => l.includes('← <App>'))).toBe(true);
    });

    it('warns when multiple root-depth nodes are present', () => {
      const cycle = makeCycle({
        nodes: [
          {
            id: 'c:X:0',
            componentName: 'X',
            cycleId: 'c',
            depth: 0,
            parentName: null,
            renderIndex: 0,
            timestamp: 1,
          },
          {
            id: 'c:Y:1',
            componentName: 'Y',
            cycleId: 'c',
            depth: 0,
            parentName: null,
            renderIndex: 1,
            timestamp: 2,
          },
        ],
      });
      logCycle(cycle, 'flat');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ancestors may not be instrumented'),
      );
    });
  });
});
