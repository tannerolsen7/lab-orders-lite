# Scaffold & Shared Primitives

> **Status: DRAFT** — awaiting human approval.
> Size: Small (infrastructure for all features to build on).

---

## What & Why

Before building any feature, the app needs a project skeleton (Next.js, Prisma, Tailwind, shadcn) and a set of reusable UI and form primitives. Patients and Lab Tests (and later Orders) all share the same patterns — list pages with search, create/edit forms with validation, detail views. Building these as shared components up front means each feature composes from the same toolkit rather than reinventing its own.

## Context

- `prisma/schema.prisma` — all models defined here.
- `docs/specs/patients.md`, `docs/specs/lab-tests.md`, `docs/specs/orders.md` — the features that consume these primitives.

## Done Looks Like

- Next.js App Router project scaffolded with TypeScript, Tailwind, shadcn/ui.
- Prisma configured with SQLite, initial schema with all models, seed script.
- Stubbed auth: `User` model with seeded "Dr. Test", `getCurrentUser()` function that returns the seeded user.
- Shared layout with navigation between Patients, Tests, and Orders.
- Reusable primitives listed below, used by all features.
- `npx tsc --noEmit` passes with zero errors on the bare scaffold.

## Shared Primitives

### Form infrastructure
- **`FormField` wrapper** — label, input, and validation error message in one component. Accepts a field name and renders the error from server action state. Used by every create/edit form.
- **`FormDialog` pattern** — a Dialog-based form container for create/edit flows (patients, lab tests). Uses App Router intercepting routes so modals are URL-reachable (`/patients/new` overlays the list), browser back closes them, and hard refresh still works. Consistent submit button, loading state, and error display.
- **`FormPage` pattern** — a page-based form container for complex create flows (orders). Used when the form has enough surface area (dropdowns, checkboxes, live previews) that a modal would feel cramped.
- **Server action error handling** — a shared pattern for returning `{ ok: true, data }` or `{ ok: false, errors }` from server actions, consumed by forms to display field-level or form-level errors.
- **`dollarsToCents(dollars: string): number`** — parses dollar input string to integer cents. Used by lab test and order forms on submit.

### List infrastructure
- **`DataTable` component** — a reusable table with column definitions. Each feature passes its own columns and data. Not a full data-grid library — just a thin wrapper around a `<table>` with consistent styling.
- **`SearchInput` component** — a controlled text input that calls a filter callback on change. Used by patients (two instances: first name, last name) and lab tests (one instance: code or name).

### Display infrastructure
- **`formatDate(date: Date | string): string`** — formats a date for display (e.g. "Jan 15, 1990"). Used everywhere dates appear.
- **`centsToDollars(cents: number): string`** — formats integer cents as dollar string for display. Used by lab tests and orders.
- **`EmptyState` component** — shown when a list has no items or search returns no matches. Consistent across all list pages.

### Layout
- **App shell** — sidebar or top nav with links to `/patients`, `/tests`, `/orders`. Active state on current route.
- **Page header** — title + action button (e.g. "Patients" + "New Patient"). Consistent across all list pages.

## Constraints

- Primitives are designed for the three features in this app. They are not a generic component library — don't over-abstract.
- shadcn components (`Button`, `Input`, `Table`, `Dialog`, `Card`, etc.) are the building blocks. Shared primitives compose them, not replace them.

## Out of Scope — Cut & Why

| Cut | Why |
|---|---|
| Config-driven form generator | With 3 forms that each have unique behavior (cross-field validation, dollar-to-cents conversion, multi-step picker), a config layer adds abstraction without saving code. Shared components (FormField, error pattern) give reuse without over-engineering. Would add a config-driven system when the app grows to 10+ similar CRUD entities. |
| Toast/notification system | Server actions redirect or revalidate — no need for toast feedback at this scale. Would add for async operations. |
| Global error boundary | Next.js `error.tsx` convention handles this. No custom error UI beyond that. |
| Dark mode | Single theme. Would add via shadcn's CSS variable theming. |
| Responsive / mobile layout | Desktop-first for a staff-facing lab tool. Would add responsive breakpoints for tablet use in clinics. |
