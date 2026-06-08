---
description: Smart commit assistant — drafts a focused message and commits staged + relevant unstaged changes
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git rev-parse:*), Read, Grep, Glob
---

# Commit

## Input

Optional message hint: `$ARGUMENTS`

## Process

1. **Run these in parallel:**
   - `git status` (NEVER use `-uall` — large repos OOM)
   - `git diff` (unstaged) and `git diff --staged` (staged)
   - `git log -5 --oneline` to match the repo's commit-message voice

2. **Classify the change.** Pick ONE prefix:
   - `feat:` — new user-facing capability
   - `fix:` — bug fix
   - `refactor:` — no behavior change
   - `chore:` — deps, config, tooling, releases
   - `docs:` — README / docs/ / CLAUDE.md / `.claude/plans/*/prd.md`
   - `test:` — test-only changes
   - `style:` — formatting only (rare; Prettier hook usually catches it before commit)

3. **Draft a 1–2 sentence message that explains WHY, not WHAT.** The diff already shows what.
   - Bad: `update Hero component`
   - Good: `fix(hero): mount canvas on iPad Safari by deferring R3F initialization to a useLayoutEffect post-mount guard`

4. **Stage only files that belong to this logical change — by name.** NEVER `git add -A` or `git add .`.
   - Group related files. If the diff spans unrelated changes, **stop and ask** whether to split into multiple commits.

5. **Before staging, scan for secrets.** Refuse and STOP if any of these are about to be committed:
   - `.env`, `.env.*` (except `.env.example`)
   - `*credentials*`, `*.pem`, `*.key`, `*.p12`
   - Any file containing `BEGIN RSA PRIVATE KEY`, `aws_secret_access_key`, `STRIPE_SECRET`, `JWT_SECRET`, or any environment variable secret
   - If the user explicitly asks to commit one of these, **ask once more** with the file list spelled out before proceeding.

6. **Commit with a HEREDOC** so the body formats correctly:

   ```bash
   git commit -m "$(cat <<'EOF'
   <type>(<scope>): <short subject under 72 chars>

   <optional 1-2 sentence body explaining the WHY>

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
   EOF
   )"
   ```

7. **Run `git status` after the commit** to confirm the working tree state.

8. **Report:** commit hash, files committed, branch name.

## Hard rules — DO NOT BREAK

- **Never `--no-verify`.** If a pre-commit / Husky / lint-staged / Prettier hook fails, the commit did NOT happen. Fix the underlying issue, re-stage, and create a NEW commit. **Do not `--amend`** — there is nothing to amend onto for a failed commit, and you'd silently mutate the previous commit instead.
- **Never `--no-gpg-sign` / `-c commit.gpgsign=false`** unless the user explicitly asks for it.
- **Never edit `git config`** — global or local.
- **Never commit secrets** (see step 5). Stop and ask.
- **Never use `git add -A` / `git add .`** — always name files explicitly so unrelated work-in-progress files don't sneak in.
- If there is nothing to commit (no staged changes and no untracked files relevant to the hint), say so and stop. Do not create empty commits.

## Notes

- **Co-author trailer:** `Claude Opus 4.7 (1M context) <noreply@anthropic.com>` — always appended; never replace it.
- This project uses **pnpm**. Hooks (Prettier via PostToolUse in `.claude/settings.json`) run via pnpm — never substitute npm/npx.
- **Scope conventions** (use as the `<scope>` in `<type>(<scope>):`): `hook`, `types`, `build`, `tests`, `docs`, `deps`, `tooling`, `release`. Match an existing one when the change fits; introduce a new one only when none apply.
- If `$ARGUMENTS` is provided, treat it as a hint for the subject line — but still rewrite to focus on WHY and conform to the prefix conventions above.
- Scope is optional — `feat: ship Hashnode-driven blog feed` is fine when the change is broad enough that a single scope would mislead.
