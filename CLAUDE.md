# CLAUDE.md

Process rules and coding discipline for this repo.
For product context, architecture, scope, and open decisions see [CONTEXT.md](CONTEXT.md).

---

## Project overview

Lab Orders Lite — a staff-facing tool for managing patients, lab test catalogs, and lab orders.
Take-home project for Enzo Health. See `docs/specs/` for feature specifications.

---

## Principles

- **Readability over cleverness.** Code should be boring, clean, and obviously correct. No abstractions that don't earn their keep. If a reviewer at 5 PM on a Friday would have to stop and think about what your code does, it's too clever.
- **Understanding is key.** Every line of code should be explainable by the person who committed it. If you can't explain why it's structured this way, don't commit it.
- **Reviews are never done by the writer.** The person who wrote the code, docs, or spec cannot review it. Fresh eyes catch what the author's brain fills in.

---

## Tech stack

- Next.js App Router · React · TypeScript · Tailwind CSS
- Prisma + SQLite · Zod · Vitest + Playwright
- shadcn/ui (owned components, not a dependency)
- Do NOT introduce: Redux, React Query, CSS modules, class components

---

## Commands

- `npm run dev` — start dev server (port 3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type check
- `npx vitest run` — run test suite
- `npx prisma migrate dev` — apply schema changes
- `npx prisma generate` — regenerate Prisma client
- `npx prisma db seed` — seed development data

---

## Before writing code

- MUST read `docs/specs/` for the feature being built — specs are the source of truth
- MUST ask before modifying spec files (`docs/specs/*.md`) — specs can change as we learn things, but changes need explicit approval
- MUST define before starting: inputs, outputs, what it must NOT do, what done looks like
- MUST ask before installing any npm package — provide: name, purpose, weekly downloads, last publish date
- If the task is ambiguous, MUST ask a clarifying question before writing anything

---

## Development workflow

### TDD required

For any new function in `lib/domain/`, `lib/services/`, or `lib/validations/`:

1. Write the test file first — it MUST fail before implementation exists
2. Write the minimum implementation to make the test pass
3. Run `npx vitest run` — all tests must be green before moving on

NEVER write implementation before tests exist.

### Shipping a change

1. Follow the "Before writing code" checklist above.
2. `git commit` — ESLint, `tsc --noEmit`, and tests must all pass.
3. Feature complete — run `/cr` before pushing. Reviews are never done by the writer.
4. `git push` — `next build` must succeed, all tests green.

---

## Architecture

### Layering (enforced)

```
Client Component
      ↓
Server Action  ────→ Zod schema (trust boundary)
      ↓
   Service (business logic + Prisma orchestration)
   ↙      ↘
Prisma   Domain utils (pure functions)
      ↓
Database
```

Read-only pages: Server Component → Service → Prisma + Domain utils.

### Layer rules

- **Components** are I/O only. No business logic. Client-side filtering and sorting is UI logic, not business logic — it stays in the component.
- **Server actions** parse input with Zod and call services. No business logic, no Prisma.
- **Services** own all business logic and database access. They receive already-parsed, typed inputs — they trust the *shape* of their inputs (Zod did its job). They enforce *business invariants* themselves (patient exists, tests are active, DOB is in past) using domain utils.
- **Domain utils** are pure functions. No imports from Prisma, React, or Next.js.
- **Zod validation** lives at the server action boundary only — never inside services.
- If a function does two distinct things, split it.

### Layer violations (any of these is wrong)

- Server action doing a `for` loop → push into service
- Service doing raw math → push into domain util
- Server action calling Prisma directly → wrap in service
- Component importing Prisma → wrong, start over
- Util importing Prisma → it's not a util, it's a service
- Util using useState → it's not a util, it's a hook

### Shared primitives

Shared components in `components/shared/` (FormField, DataTable, SearchInput, EmptyState) are defined by the scaffold spec and built before features. The "don't abstract until the third use" rule applies to further abstractions beyond what the scaffold defines.

### UserId flow

Server actions call `getCurrentUser()` and pass the userId explicitly to services. Services never call `getCurrentUser()` themselves — it comes in as a parameter (`createdById`, `updatedById`).

### Error signaling

Services throw errors. Server actions catch them and return a structured result. One pattern everywhere:

```ts
type ActionResult = { ok: true } | { ok: false; error: string }
```

Field-level validation errors come from Zod (before the service is called). Service errors are business-level ("patient not found", "invalid status transition") and map to a single `error` string.

---

## Conventions

### Money
- Store as integer cents (`priceCents: Int`) everywhere
- Convert dollars → cents at the server action boundary (form input arrives as dollar string)
- Convert cents → dollars at the display boundary (component renders dollar string)

### Timestamps
- Store as UTC (Prisma `DateTime`)
- Format to local timezone at display only

### IDs
- CUID via `@default(cuid())` on all models

### Snapshotting
- Order items snapshot `priceCents` and `turnaroundHours` from the lab test catalog at creation
- Snapshotted values are frozen — catalog changes never affect existing orders
- Field names use the `Snapshot` suffix to make the invariant self-documenting

### Soft delete
- Lab tests use `active: Boolean @default(true)` — never hard-delete
- Filter `active = true` in creation pickers; show inactive items in historical views

---

## File and export conventions

- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`: default export (Next.js requirement)
- All other components: named export
- Utilities, services, schemas: named export
- Component file names: `PascalCase.tsx`
- Utility, service, and schema file names: `camelCase.ts`
- Path alias: `@/` resolves from project root

### Folder structure

```
app/
  layout.tsx            — app shell with navigation
  patients/             — pages + server actions
  tests/                — pages + server actions (lab test catalog)
  orders/               — pages + server actions
components/
  ui/                   — shadcn primitives (Button, Input, Table, etc.)
  shared/               — reusable composed components (FormField, DataTable, SearchInput, EmptyState)
lib/
  services/             — business logic + Prisma orchestration (patients, labTests, orders)
  domain/               — pure functions (money, dates, state machine)
  validations/          — Zod schemas
  db.ts                 — Prisma client singleton
prisma/
  schema.prisma
  seed.ts
  migrations/
```

---

## Code style

- ONLY write a comment when the WHY is non-obvious — one line maximum
- Use `cn()` (clsx + tailwind-merge) for conditional Tailwind class merging

---

## Testing

- Test framework: Vitest — colocate test files next to the file under test
- Unit tests for all pure functions in `lib/domain/`
- Integration tests for service functions in `lib/services/`
- Each test creates its own data and cleans up after itself. Never depend on seed data. Use `beforeEach`/`afterEach` to ensure isolation between tests.
- Each behavior is one test — do not bundle multiple assertions about different behaviors
- No snapshot tests

---

## Commit conventions

Conventional commits. Body explains why, not what.

```
type(scope): short description

Why this change was made and what it addresses.

Co-Authored-By: Claude <current model name> <noreply@anthropic.com>
```

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`
Do not bundle unrelated changes in a single commit.

---

## Before finishing

- `npx tsc --noEmit` passes with zero errors
- `npx vitest run` passes
- `npm run build` succeeds
- No unused imports, dead code, or placeholder comments remain

---

## NEVER

- NEVER use `any`
- NEVER use `// @ts-ignore` or `// @ts-expect-error`
- NEVER cast with `as` without a preceding narrowing check
- NEVER install a dependency without asking first
- NEVER put business logic inside a component
- NEVER call Prisma from a component, page, or server action — go through services
- NEVER mock the database in tests
- NEVER expand scope without surfacing it as a scope question
- NEVER leave dead code, unused props, or placeholder comments in place
- NEVER use floats for money
- NEVER concatenate Tailwind class strings manually
- NEVER write multi-line comment blocks or docstrings
- NEVER write a comment that describes what the code does
