# Workflow — Testing

## Stack

- **Runner:** Vitest
- **DOM:** jsdom
- **Components:** React Testing Library + `@testing-library/user-event`
- **Coverage:** `@vitest/coverage-v8`

## Commands

```bash
pnpm run test            # Run all tests once
pnpm run test:watch      # Watch mode
pnpm run test:coverage   # With V8 coverage report
open coverage/index.html # Open HTML coverage report
```

## Test Directory

`tests/` at project root — outside `src/` so Next.js compilation doesn't process test files.

```
tests/
├── setup.tsx          # Global mocks — run before every suite
├── test-utils.tsx     # Custom render wrapping Redux Provider
├── components/        # Component tests
├── data/              # Data integrity tests
├── lib/               # Utility function tests
├── store/             # Redux slice tests
└── ui/                # UI logic tests (variants, timeline utils)
```

## Global Mocks (setup.tsx)

Applied globally — do **not** re-mock in individual test files:

Check `tests/setup.tsx` for the current list. Update it there when adding new global mocks — do not duplicate per test.

## test-utils.tsx

Use instead of the default `render` for any component that uses the Redux store:

```tsx
import { render } from '../test-utils'
// wraps in <Provider store={store}>
```

## What to Test

- **Utilities** (`src/lib/utils/`) — pure functions, edge cases
- **Redux slices** — initial state, action creators, state transitions
- **Components** — rendered text, conditional classes, user interactions, open/closed state
- **Data integrity** — required fields, unique IDs, sequential ordering


## What NOT to Test

- Purely presentational Server Components (no logic)
- Static data shape — TypeScript strict mode covers this
- Animations and visual details

## Rules

- Prefer `getByRole()` / `getByText()` over `querySelector`
- One assertion per `it()`
- Never mock internal utilities — mock only at system boundaries (fetch, localStorage, router)
- Fix the real issue — do not delete or skip failing tests
- Do not widen types to silence errors

---

## See also

For Playwright e2e conventions, see [`e2e.md`](./e2e.md) — project matrix, fixture catalog, wait strategy, and mock-everything-external rule. Vitest+RTL conventions in this file remain authoritative for unit/component tests.

### External reference

Project rules in this file are authoritative; external references are framework-level guidance — load when project rules don't cover the case.

- [`external/testing/playwright-best-practices/`](../external/testing/playwright-best-practices/) — Playwright fundamentals (POM, fixtures, mocking via `page.route()`, axe-core a11y, visual regression, console-error monitoring). **Load only when writing Playwright e2e specs.** Cited from `workflow/e2e.md`.
- [`external/testing/e2e-testing-patterns/`](../external/testing/e2e-testing-patterns/) — patterns reference (selector strategy, fixture composition, parallelism, flake mitigation). Pair with `playwright-best-practices`.
