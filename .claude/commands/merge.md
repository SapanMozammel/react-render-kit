---
description: Safe local merge — quality gate, smart squash-vs-merge default, refuses dirty trees and divergent targets, never pushes
allowed-tools: Bash(git merge:*), Bash(git checkout:*), Bash(git fetch:*), Bash(git status:*), Bash(git rev-parse:*), Bash(git rev-list:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(git branch:*), Bash(git remote:*), Bash(pnpm run lint:*), Bash(pnpm run test:*), Bash(pnpm run type:check:*), Bash(pnpm run build:*)
---

# Merge

Local merge of a **source branch** into the **current branch** — matches `git merge <branch>` convention. Defaults: `feature/*` → `dev` (squash), `dev` → `main` (no-ff merge commit). Never pushes, never force-merges, never auto-resolves conflicts.

## Input

Source branch + optional flags: `$ARGUMENTS`

Examples:
- `/merge feature/foo` — squash-merge `feature/foo` into the current branch (likely `dev`)
- `/merge dev` — from `main`, no-ff merge `dev` into `main` (release flow)
- `/merge feature/foo --no-squash` — override squash default
- `/merge dev --skip-build` — release flow without rebuilding (only if dev was already built)

The first non-flag argument is the **source** (the branch whose changes will be folded into the current branch). If no source is provided, the command stops and asks — there is no safe auto-default for "what to merge".

## Flags

Parse `$ARGUMENTS`, strip flags, treat the first remaining token as the source branch:

- `--squash` — force squash merge (single commit on target)
- `--no-squash` — force regular merge (preserve source history)
- `--delete-source` — after a successful merge, delete the source branch locally (remote untouched)
- `--skip-tests` — skip Vitest (doc-only merges only)
- `--skip-build` — skip the `pnpm run build` smoke (doc-only or non-route changes only)

## Process

1. **Detect default branch + branches.**

   ```bash
   BASE=$(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null | sed 's@^origin/@@')
   BASE=${BASE:-main}
   TARGET=$(git rev-parse --abbrev-ref HEAD)
   SOURCE="$1"   # first non-flag token from $ARGUMENTS
   ```

   - If `SOURCE` is empty: stop. Ask the user which branch to merge. Do NOT auto-pick a recent feature branch.
   - If `SOURCE` equals `TARGET`: abort. Cannot merge a branch into itself.
   - If `TARGET` equals `$BASE` and `SOURCE` is a `feature/*` branch: surface a warning. The standard flow is `feature/*` → `dev` → `$BASE`, not `feature/*` → `$BASE` directly. Require explicit user confirmation before proceeding.

2. **Working-tree sanity (target side).**

   - Run `git status`. If the target branch (current) has uncommitted changes, the merge can lose them. Two paths:
     - **If the changes are unrelated drift the user wants to keep across the merge:** offer to stash automatically, perform the merge, then `git stash pop` — but ONLY when the diff scope clearly doesn't overlap with the source (compute `git diff --name-only <source-tip-of-source>...$TARGET` against the current `git status` paths). On overlap risk, abort and ask the user to commit or stash manually.
     - **If the changes overlap with the source:** abort. Tell the user to `/commit`, `/commit-staged`, or stash by hand before merging.

3. **Source-branch sanity.**

   - The source must have commits beyond the target:
     ```bash
     git rev-list --count "$TARGET..$SOURCE"  # must be > 0
     ```
     If 0, abort: "Nothing to merge — `$SOURCE` is not ahead of `$TARGET`."

   - **Content-level check** — even if commit-count > 0, abort when the **diff** is empty:
     ```bash
     git diff --quiet "$TARGET" "$SOURCE" && echo "EMPTY DIFF"
     ```
     Empty diff means the source has unique commits but the target already contains the equivalent content — typically the result of a prior squash-merge of the same source. Abort with a message like: "`$SOURCE` was already squash-merged into `$TARGET`. Nothing new to apply. If you want to delete the source branch, run `git branch -D $SOURCE`." Do NOT proceed with another merge — it would stage an empty diff.

3. **Sync state with the remote** (read-only — no auto-pull).

   ```bash
   git fetch origin
   ```

   Check the target branch is up to date with its remote tip:
   ```bash
   git rev-list --count "origin/$TARGET..$TARGET"  # commits local target is ahead of origin
   git rev-list --count "$TARGET..origin/$TARGET"  # commits origin has that local target lacks
   ```

   - If local `$TARGET` is **behind** origin: abort. Ask the user to `git checkout $TARGET && git pull` first. Do not auto-pull.
   - If local `$TARGET` is **ahead** of origin: surface it (informational; not blocking — local-only commits are fine for a merge).

4. **Pick the default merge strategy** (only when neither `--squash` nor `--no-squash` was provided), based on the **source** branch shape:

   - Source `feature/*` / `fix/*` / `chore/*` / `docs/*` / `test/*` / `refactor/*` / `style/*` → **squash** (one commit per feature on `dev`)
   - Source `dev` (target = `$BASE`) → **`--no-ff`** (preserves dev history into main; release commits group together)
   - Anything else → **`--no-ff`** (default) — surface the choice in the report so the user can override

5. **Quality gate** — temporarily switch to the source branch, run in this order, stop on first failure:

   ```bash
   git checkout "$SOURCE"
   pnpm run lint
   pnpm run test         # skip iff --skip-tests AND diff is docs-only
   pnpm run type:check
   ```

   Plus, conditionally:

   ```bash
   pnpm run build        # if app/**, src/app/**, next.config.ts, src/proxy.ts, or .env* changed (skip iff --skip-build)
   ```

   Decide whether build is needed by checking `git diff --name-only "$TARGET...$SOURCE"` against those paths.

   Verify `--skip-tests` only on docs-only diffs:
   ```bash
   git diff --name-only "$TARGET"..."$SOURCE" | grep -vE '\.md$|^docs/' | head -1
   # If grep returns any line, the diff is NOT docs-only — refuse --skip-tests
   ```

   After gate passes, return to the target:
   ```bash
   git checkout "$TARGET"
   ```

   **Skip the gate entirely** if the user already ran the full pipeline against `$SOURCE`'s current HEAD in the same session and HEAD hasn't moved — surface the skip explicitly in the report so the user can challenge it.

6. **Execute the merge** (we're already on `$TARGET`).

   Based on chosen strategy:

   - **Squash:** `git merge --squash "$SOURCE"` then guide the user to `/commit-staged` with a drafted message.
     - Drafted message format:
       ```
       <type>(<scope>): <short title>     # derive from source branch type/name
       
       <body — bullet list of source's commit messages or PR-style summary>
       
       Squashed from: <source branch name>
       <count> commits squashed.
       
       Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
       ```
   - **`--no-ff` merge commit:** `git merge --no-ff "$SOURCE" -m "Merge <source> into <target>"`. The merge commit message:
     ```
     Merge <source> into <target>
     
     <body — short summary if release-flow; omit if routine integration>
     ```

   If the merge fails with conflicts:
   - **Stop.** Print conflicting files. Tell the user to resolve manually + `git add` + `git commit` (or `git merge --abort` to back out).
   - Do NOT auto-resolve. Do NOT prefer one side blindly.

7. **Post-merge report.**

   Print:
   - Merged commit hash (or "squash staged — run `/commit-staged` to finalize")
   - Files changed + line totals (`git diff --stat HEAD~1 HEAD`)
   - Reminder: **nothing has been pushed.** Run `/push` when ready.

8. **Optional source-branch cleanup** (only when `--delete-source` was passed):

   ```bash
   git branch -d "$SOURCE"   # safe delete — refuses if source isn't fully merged
   ```

   If `git branch -d` fails (e.g. squash merge means git doesn't recognize the merge), surface the error and ask whether to force with `git branch -D`. Never delete with `-D` automatically.

## Hard rules — DO NOT BREAK

- **Never push.** This command stops at the local merge commit. The user runs `/push` separately.
- **Never auto-pull.** If the local target is behind origin, abort and ask the user to update.
- **Never force-merge** (`--no-verify`, `--allow-unrelated-histories`, etc.).
- **Never auto-resolve conflicts.** Conflicts are human decisions.
- **Never delete the source branch with `-D`** (force) automatically. `-d` (safe) only, and only when `--delete-source` was requested.
- **Never merge `$BASE` into anything.** Default branch is the merge target, never the source.
- **Never skip the quality gate silently.** `--skip-tests` / `--skip-build` are the only escape hatches and only for verified-docs diffs.
- **Default branch is detected dynamically** via `git rev-parse --abbrev-ref origin/HEAD`. Override only via `$ARGUMENTS`.

## Squash vs --no-ff — quick reference

| Source | Target | Default | Why |
|---|---|---|---|
| `feature/foo` | `dev` | `--squash` | `dev` history is one commit per feature; cleaner blame |
| `dev` | `main` | `--no-ff` | Release: keeps the feature commits visible in main's first-parent line |
| `hotfix/foo` | `main` | `--no-ff` | Hotfix: preserve the small fix commit chain for audit |
| anything | sibling | `--no-ff` | Don't lose context on cross-branch merges |

Override either default with `--squash` or `--no-squash`.

## Notes

- This project uses **pnpm**. Never substitute `npm` / `npx` / `yarn`.
- TypeScript strict mode + `exactOptionalPropertyTypes` are on; `pnpm run type:check` is the canonical type check.
- Prettier runs via the PostToolUse hook + `/format` — no separate command in the merge gate. Prefer `/format` when the diff touches `className` strings or `@apply` directives.
- **Memory-anchored rule:** never push or commit without explicit user direction. The squash flow drops you at staged-but-uncommitted state on purpose — finalize with `/commit-staged` when you're ready.
