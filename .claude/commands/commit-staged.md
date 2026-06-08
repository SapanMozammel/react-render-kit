# /commit-staged [message?]

**Purpose:** Commit only what is already staged — do not add or modify the staging area.

Steps Claude must follow:
1. Run `git status` to confirm there are staged changes
2. If nothing is staged, report "Nothing staged to commit" and stop
3. Run `git diff --cached` to review exactly what will be committed
4. Run `git log --oneline -5` to match the repo's commit message style
5. If `$ARGUMENTS` is provided, use it as the commit message
6. If `$ARGUMENTS` is empty, draft a concise commit message from the staged diff
7. Create the commit using a HEREDOC format, appending the co-author trailer
8. Run `git status` after commit to verify success
9. Report: commit hash, files committed, branch name

**Commit message format:**
```
<type>: <short description>

<optional body — what changed and why>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Types:** `feat` (new feature), `fix` (bug fix), `refactor`, `chore`, `docs`, `test`, `style`

**Rules:**
- Never stage additional files — commit only what the user has already staged
- Never amend previous commits unless explicitly asked
- Never skip hooks (`--no-verify`)
- Never push unless explicitly asked
- If pre-commit hook fails, fix the issue and create a NEW commit
