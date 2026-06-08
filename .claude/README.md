# Claude Code Workspace

This directory contains the Claude Code workspace for react-render-kit — conventions, slash commands, sub-agents, and PRD plans. Everything Claude Code needs to work productively in this repo lives under `.claude/`.

## Layout

| Sub-tree | Purpose |
|---|---|
| [`skills/`](skills/) | Conventions Claude loads on demand. Framework-level guidance lives under [`skills/external/`](skills/external/README.md). |
| [`commands/`](commands/) | Slash commands. Planning: `/plan`, `/implement`. Review: `/review`. Git: `/commit`, `/commit-staged`, `/push`, `/pr`, `/merge`. Test: `/test`, `/fix-issue`. |
| [`agents/`](agents/) | Sub-agents invoked via the Agent tool: `code-reviewer`, `test-writer`. |
| [`plans/`](plans/) | PRDs (`[kebab-name]/prd.md`). Active and historical work — completed `[✅]` steps are preserved; never overwrite history. |

## Authority

Project rules in `CLAUDE.md` are authoritative. When external guidance under `skills/external/` conflicts with project rules, project rules win.
