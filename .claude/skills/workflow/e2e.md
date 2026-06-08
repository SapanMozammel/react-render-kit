---
name: e2e
description: "Playwright + axe-core e2e conventions for react-render-kit. Triggers when authoring or modifying any spec under e2e/, fixtures, page objects, or playwright.config.ts. Cites external/testing/playwright-best-practices and external/testing/e2e-testing-patterns; extends project conventions in workflow/testing.md."
---

# Workflow — End-to-End Testing (Playwright + axe-core)

## When to write an e2e

Defer to [`workflow/testing.md`](./testing.md) for the unit-vs-e2e boundary. As a heuristic, e2e is for:

- Browser-driven flows that `renderHook` in jsdom can't fully exercise
- Accessibility — axe-core scans on production-like pages
- Visual regressions where computed styles matter

If the assertion fits comfortably in jsdom + RTL, it belongs in `tests/`, not `e2e/`.

---

## Wait strategy

| Wait | Allowed? | Use |
|---|---|---|
| `await expect(locator).toBeVisible()` / `toHaveText()` / `toHaveURL()` | yes | Auto-waiting matchers — preferred |
| `await locator.waitFor({ state: 'visible' })` | yes | Element-level deterministic wait |
| `await page.waitForLoadState('networkidle')` | **NO** | Non-deterministic — keep network hot conditions cause flakes |
| `await page.waitForTimeout(ms)` | **NO** | Wall-clock waits are flake. Always wait on a deterministic state. |

---

## Mock-everything-external rule

Every external network call has a `page.route()` mock — without exception.

A spec that hits a real external service is rejected at review.

---

## Reduced-motion-default policy

Emulate `prefers-reduced-motion: reduce` in the default `page` fixture so animations settle instantly and assertions are stable.

---

## See also

- [`external/testing/playwright-best-practices/SKILL.md`](../external/testing/playwright-best-practices/SKILL.md) — comprehensive Playwright reference (POM, mocking, axe-core, visual regression)
- [`external/testing/e2e-testing-patterns/SKILL.md`](../external/testing/e2e-testing-patterns/SKILL.md) — patterns reference (selectors, fixture composition, parallelism, flake mitigation)
- [`workflow/testing.md`](./testing.md) — Vitest unit + hook conventions; unit-vs-e2e boundary
