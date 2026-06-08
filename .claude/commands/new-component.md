# /new-component [Name]

**Purpose:** Scaffold a reusable UI component.

Steps Claude must follow:
1. Confirm `Name` is provided — ask if missing
2. Ask: Server or Client? (default: Server)
3. Read a similar component in `src/components/ui/` for reference
4. Load `component-patterns.md`
5. Create `src/components/ui/[kebab-name]/index.tsx`:
   - Correct component type
   - `type Props = { ... }` — no `any`
   - `cn()` for all classNames
   - `memo()` + `displayName` if Client
   - `export default ComponentName`
6. Apply pre-write checklist before finishing

**Rules:** No `any` types. Props type is required (`type Props = { ... }`, never `interface`). `memo()` + `displayName` mandatory for Client Components. Export default at the bottom.
