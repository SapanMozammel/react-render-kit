# react-render-kit

A small collection of zero-dependency, dev-friendly React utilities focused on one thing: helping you understand and control component renders.

## Packages

| Package                                           | Status     | What it does                                                                            |
| ------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| [`why-render`](packages/why-render)               | ✅ shipped | A hook that logs **why** a component re-rendered by diffing previous vs. current props. |
| [`react-props-guard`](packages/react-props-guard) | 🚧 planned | Runtime guards for prop contracts in development.                                       |
| [`react-safe-render`](packages/react-safe-render) | 🚧 planned | Safer render boundaries with structured error reporting.                                |

## Getting started

This repo is a [pnpm](https://pnpm.io/) workspace.

```bash
pnpm install
pnpm -r build      # build every package
pnpm -r test       # run every package's tests
```

To work on a single package:

```bash
pnpm --filter why-render dev    # tsup --watch
pnpm --filter why-render test
```

## Folder layout

```
react-render-kit/
├── packages/
│   ├── why-render/             # the first hook — ships today
│   ├── react-props-guard/      # planned
│   └── react-safe-render/      # planned
├── pnpm-workspace.yaml
├── tsconfig.json
└── package.json
```

## Design principles

1. **Dev-only by default.** Every utility no-ops in production builds so it can be left in real components without performance or bundle cost.
2. **Tiny, no runtime deps.** Each package is a few hundred lines of TypeScript with `react` as the only peer.
3. **Pure logic, isolated I/O.** Diffing, guarding, and comparing live in pure functions that are trivially testable; React glue is a thin shell on top.
4. **Minimal API.** One main export per package. No config files. No providers.

## License

MIT
