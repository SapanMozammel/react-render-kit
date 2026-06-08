---
description: Safe push — quality gate, refuses to force-push to the default branch, sets upstream when needed
allowed-tools: Bash(git push:*), Bash(git rev-parse:*), Bash(git remote:*), Bash(git status:*), Bash(git branch:*), Bash(git fetch:*), Bash(pnpm run lint:*), Bash(pnpm run test:*), Bash(pnpm run type:check:*)
---

# Push

## Input

Optional flags: `$ARGUMENTS`

- `--skip-tests` — skip the Vitest run (allowed only for doc-only / comment-only changes)
- `--force-with-lease` — allow `git push --force-with-lease` on a feature branch (must be requested explicitly)
- `--force` — bare force push; **requires double confirmation** and is BLOCKED on the default branch (auto-detected)

## Process

1. **Detect the default branch** dynamically (portable across repo renames):

   ```bash
   BASE=$(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null | sed 's@^origin/@@')
   # Fallback if origin/HEAD isn't set: assume "main"
   BASE=${BASE:-main}
   ```

2. **Branch guard.**

   ```bash
   CURRENT=$(git rev-parse --abbrev-ref HEAD)
   ```

   If `CURRENT` equals `$BASE`:
   - **Abort.** Ask the user to create a feature branch first (`git checkout -b feature/<name>`).
   - Do NOT push. Do NOT offer to force-push.

3. **Working tree check.** Run `git status`. If there are uncommitted changes, stop and ask whether to commit them first (suggest `/commit` for new work or `/commit-staged` if changes are already staged). Do not push a dirty tree silently.

4. **Upstream check.**

   ```bash
   git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
   ```

   - If it errors / no upstream: this is a first-time push — use `git push -u origin "$CURRENT"`.
   - If upstream exists: plain `git push`.
   - **Do not auto-rebase / auto-pull.** If the remote has diverged, surface that and let the user resolve manually.

5. **Quality gate** (must pass before push, in this order):

   ```bash
   pnpm run lint
   pnpm run test            # skip iff --skip-tests
   pnpm run type:check
   ```

   If any step fails — **stop**. Print the failure and let the user fix it. Do NOT push a broken branch.

   - `--skip-tests` is only acceptable when the diff is purely `*.md` / `docs/**` / comment changes. Verify the diff matches that scope before honoring the flag:
     ```bash
     git diff --name-only "$BASE"...HEAD | grep -vE '\.md$|^docs/' | head -1
     # If grep returns any line, the diff is NOT docs-only — refuse --skip-tests
     ```
   - Prettier runs via the PostToolUse hook in `.claude/settings.json` and via `/format` (or `pnpm run format:all` directly) before commit; no separate command is needed here. Use `/format` when changes touch `className` strings or `@apply` directives — it adds the Tailwind v3→v4 `!utility` sweep on top of the standard format pipeline.

6. **Push.**
   - Default: `git push` (or `git push -u origin "$CURRENT"` for first push).
   - `--force-with-lease`: only if explicitly requested AND `CURRENT` is not `$BASE`.
   - `--force`: BLOCKED on `$BASE`. Elsewhere, require the user to repeat the request verbatim before running it.

7. **Print the upstream URL** after a successful push so the user can open the branch / open a PR:

   ```bash
   ORIGIN=$(git remote get-url origin)
   # Convert SSH or HTTPS to a browsable GitHub URL, e.g.
   # git@github.com:owner/repo.git → https://github.com/owner/repo/tree/<branch>
   # https://github.com/owner/repo.git → https://github.com/owner/repo/tree/<branch>
   echo "$ORIGIN" | sed -E 's|^git@github.com:|https://github.com/|; s|\.git$||' | xargs -I{} echo "{}/tree/$CURRENT"
   ```

## Hard rules — DO NOT BREAK

- **Never force-push to the default branch.** Block it even if the user insists. If they truly need it, they can do it from their own terminal — this command will not.
- **Never `--no-verify`.** Pre-push hooks exist for a reason.
- **Never auto-rebase or auto-pull** before pushing. Diverged history is a human decision.
- **Never skip the quality gate** silently. `--skip-tests` is the only escape hatch and only for docs.
- **Do not amend or rewrite history** as part of `/push`. That is out of scope here — use `/commit` for new commits.

## Notes

- This project uses **pnpm**. Never substitute `npm` / `npx` / `yarn`.
- The full `pnpm run build` is intentionally NOT in this gate — it's slow and gated in `/pr` instead. Push should stay fast enough to use frequently.
- TypeScript strict mode is enforced via `pnpm run type:check` (which runs `tsc --noEmit`).
- The default branch is detected dynamically via `git rev-parse --abbrev-ref origin/HEAD` — this command works across repo renames without code changes.
