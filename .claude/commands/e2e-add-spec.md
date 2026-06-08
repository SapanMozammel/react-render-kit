---
description: Scaffold a new Playwright e2e spec via the e2e-spec-author agent — runs the resulting spec on chromium-desktop and reports surface
allowed-tools: Bash(pnpm exec playwright test*), Bash(pnpm exec tsc -p tsconfig.e2e.json --noEmit*), Bash(ls *), Read
---

# E2E Add Spec

Delegates to the `e2e-spec-author` agent to author a new Playwright e2e spec for react-render-kit. The agent reads the project's e2e conventions before writing, decides scope / project matrix / mock surface, scaffolds the spec, and runs it on `chromium-desktop` for fast feedback.

## Input

Feature description: `$ARGUMENTS`

Examples:
- `/e2e-add-spec Test that the FAQ accordion expands on click and persists open state across reload`
- `/e2e-add-spec Verify locale-prefixed article URLs resolve and the canonical link matches the locale`
- `/e2e-add-spec Confirm the contact modal traps focus on Tab and returns focus to the Connect CTA when closed`

## Process

1. **Validate the feature description.** If `$ARGUMENTS` is empty or vague (no observable outcome), stop and ask the user to restate. Do not invent scope.

2. **Confirm prerequisites:**

   ```bash
   ls e2e/fixtures.ts e2e/pages playwright.config.ts >/dev/null 2>&1 || echo "MISSING"
   ```

   - If any of `e2e/fixtures.ts`, `e2e/pages/`, `playwright.config.ts` are missing, abort with: "E2e infrastructure not present — restore the `e2e/` directory before running this command."
   - Verify `.claude/agents/e2e-spec-author.md` exists; abort if missing with: "`e2e-spec-author` agent not registered — restore `.claude/agents/e2e-spec-author.md` before running this command."

3. **Invoke the `e2e-spec-author` agent** via the Agent tool with `subagent_type: 'e2e-spec-author'`. Pass the feature description verbatim, plus brief context:
   - Current `e2e/` spec list (so the agent decides single-purpose-vs-extension)
   - The user's intent in one sentence — copied from the slash-command input

4. **After the agent completes:**
   - Read the agent's report — it will name the spec file path, the project matrix it runs on, mocks added, and source files read for assertions
   - Run a final type-check + the new spec against `chromium-desktop` only:

     ```bash
     pnpm exec tsc -p tsconfig.e2e.json --noEmit
     pnpm exec playwright test --project=chromium-desktop e2e/<the-new-spec>.spec.ts
     ```

5. **Report:**
   - Spec file path
   - Project matrix coverage
   - Mocks added
   - Source files the spec reads for assertions (translation JSON, content TS files)
   - Manual review notes — flag any structural selector, allow-list entry, or `test.skip` gate
   - Reminder: **the user reviews the spec before commit.** This command does not stage, commit, or push.

## Hard rules — DO NOT BREAK

- **Never push.** Stops at the new spec file + the chromium-desktop run output.
- **Never commit.** The user reviews and runs `/commit-staged` when ready.
- **Never extend the agent's tool surface** — if the agent says it needs more, surface that to the user; do not silently broaden it.
- **Refuse to scaffold a spec that hits real external services.** All third-party POSTs / scripts must be mocked via `page.route()` or the existing fixtures (`mockContact`, `mockTurnstile`).
- **Always run the new spec on `chromium-desktop`** before reporting. A spec that hasn't been run isn't done.
- If the spec fails, report the failure verbatim and stop. Do not "fix" by broadening assertions.

## Notes

- This command is the user-facing entry point; the heavy lifting lives in `.claude/agents/e2e-spec-author.md`. Update the agent for any change to spec authoring conventions; this command's process should stay thin.
- For a Lighthouse run instead of a new spec, see `/lhci`.
- See [.claude/skills/workflow/e2e.md](../skills/workflow/e2e.md) for project e2e conventions.
