/* eslint-disable no-console */
import type { LogMode, RenderCycle, RenderNode } from '../types';

type TreeNode = {
  node: RenderNode;
  children: TreeNode[];
};

const buildTree = (nodes: RenderNode[]): TreeNode[] => {
  const roots = nodes.filter((n) => n.depth === 0).sort((a, b) => a.renderIndex - b.renderIndex);

  const findChildren = (parent: RenderNode): TreeNode[] =>
    nodes
      .filter((n) => n.parentName === parent.componentName && n.depth === parent.depth + 1)
      .sort((a, b) => a.renderIndex - b.renderIndex)
      .map((n) => ({ node: n, children: findChildren(n) }));

  return roots.map((n) => ({ node: n, children: findChildren(n) }));
};

const printTree = (treeNodes: TreeNode[], prefix: string): string[] => {
  const lines: string[] = [];
  treeNodes.forEach((tn, idx) => {
    const isLast = idx === treeNodes.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';
    lines.push(`${prefix}${connector}<${tn.node.componentName}>`);
    lines.push(...printTree(tn.children, prefix + childPrefix));
  });
  return lines;
};

export const logCycle = (cycle: RenderCycle, mode: LogMode): void => {
  if (mode === 'silent') return;

  const duration = cycle.endTime != null ? `${cycle.endTime - cycle.startTime}ms` : '—';
  const rootLabel = cycle.rootTrigger ? `<${cycle.rootTrigger}>` : '(unknown)';
  const title = `[render-trace] ${cycle.id} · ${cycle.totalRenders} render${cycle.totalRenders !== 1 ? 's' : ''} · root: ${rootLabel} · ${duration}`;

  if (mode === 'flat') {
    console.groupCollapsed(title);
    for (const node of cycle.nodes) {
      const indent = '  '.repeat(node.depth);
      const parent = node.parentName ? ` ← <${node.parentName}>` : '';
      console.log(`${indent}<${node.componentName}>${parent} [depth ${node.depth}]`);
    }

    // Warn when multiple root-depth nodes are present (partial instrumentation)
    const rootCount = cycle.nodes.filter((n) => n.depth === 0).length;
    if (rootCount > 1) {
      console.warn(
        `[render-trace] ${rootCount} root-depth components detected. ` +
          'Some ancestors may not be instrumented.',
      );
    }

    console.groupEnd();
    return;
  }

  // tree mode
  const tree = buildTree(cycle.nodes);
  console.groupCollapsed(title);

  if (tree.length === 0) {
    console.log('(no nodes)');
  } else {
    const lines = printTree(tree, '');
    for (const line of lines) console.log(line);

    if (tree.length > 1) {
      console.warn(
        `[render-trace] ${tree.length} disconnected render roots detected. ` +
          'Some ancestors may not be instrumented.',
      );
    }
  }

  console.groupEnd();
};
