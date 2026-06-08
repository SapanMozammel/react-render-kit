---
name: tailwind-v4-syntax
description: "Triggers when editing classNames or @apply directives that use Tailwind v3 syntax in this v4 project. Most common: the `!important` modifier moved from prefix (`!h-9`) to suffix (`h-9!`). Also flags any v3-only utilities/variants that don't exist in v4. Use when authoring or refactoring components, fixing IDE `suggestCanonicalClasses` diagnostics, or sweeping the codebase for v4 hygiene."
---

# Tailwind v4 Syntax (`tailwindcss@^4.2.4`)

## Important modifier moved from prefix to suffix

| v3 (legacy, still works via backwards-compat) | v4 (canonical) |
|---|---|
| `!h-9` | `h-9!` |
| `!leading-none` | `leading-none!` |
| `!text-transparent` | `text-transparent!` |
| `!font-normal` | `font-normal!` |
| `!outline-none` | `outline-none!` |
| `!px-[calc(theme(height.9)*21/44)]` | `px-[calc(theme(height.9)*21/44)]!` |

The `!` always sits at the **end of the entire utility**, after any variant prefix has done its work:

| v3 | v4 |
|---|---|
| `sm:!h-11` | `sm:h-11!` |
| `dark:!bg-success` | `dark:bg-success!` |
| `hover:!text-primary` | `hover:text-primary!` |
| `motion-reduce:!animate-none` | `motion-reduce:animate-none!` |

Same rule for `@apply` directives in SCSS:

```scss
/* v3 */
@apply font-hg text-3xl !leading-tight font-bold;

/* v4 */
@apply font-hg text-3xl leading-tight! font-bold;
```

## How to find them

Two sources of truth, kept in parity:

- **IDE**: VS Code Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`) flags every v3-form occurrence inline with diagnostic code `suggestCanonicalClasses`.
- **CLI / CI**: `better-tailwindcss/enforce-consistent-important-position` (wired via `.formatter/sync.js`) reports the same set on `pnpm run lint`.

A grep fallback if you need it without a tool: `grep -rEn "['\"\`][^'\"\`]*![a-z][a-z0-9-]+" src --include='*.tsx' --include='*.ts'` plus `grep -nE "@apply[^;]*![a-z][a-z0-9-]+" src/styles/*.scss`. The v4 form (`utility!`) is a different shape (`[a-z0-9-]+!\b`), so the two patterns don't overlap.

## How to fix

**Single utility:** move the `!` to the end of the base class, leaving any variant prefix in place.

**Whole codebase:** run `pnpm run lint:fix` (or `/format`, which wraps it). The `better-tailwindcss/enforce-consistent-important-position` rule is autofixable and rewrites every `!utility` to `utility!` in one pass — TSX/TS classNames AND SCSS `@apply` directives. `/fix-tw-diagnostics` is the broader entry point that also handles the rest of `suggestCanonicalClasses` (v3 aliases, arbitrary-property hints) and reports `cssConflict`.

**Full v3 → v4 migration (config + tokens + syntax):** the upstream codemod handles every case but is broader scope:

```bash
pnpm dlx @tailwindcss/upgrade
```

Use the codemod when also migrating `tailwind.config.ts` shape, theme tokens, etc. For an in-file syntax-only sweep, `pnpm run lint:fix` is the right tool — it's scoped, idempotent, and won't touch your token files.

## What NOT to change

- Plain JavaScript negation (`!isOpen`, `!ctx`, `!body.contains(...)`) — these are JS, not Tailwind classes. The grep above stays inside quoted strings to avoid them.
- `!important` declarations in raw CSS (`color: red !important`) — that's CSS spec, untouched by either Tailwind version.

## See also

- [`tailwind-diagnostics`](./tailwind-diagnostics.md) — broader sweep covering both the `!important` migration (sub-case 1a of `suggestCanonicalClasses`) and `cssConflict` reporting. Use via `/fix-tw-diagnostics` when scoping wider than just the `!utility` form.
- [`architecture/component-patterns.md`](../architecture/component-patterns.md) — `cn()` mandate for className composition
