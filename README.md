# Lab Orders Lite

Staff-facing tool for managing patients, lab test catalogs, and lab orders. Built with Next.js App Router, Prisma + SQLite, and TypeScript.

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech stack

- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **Database:** SQLite via Prisma ORM
- **Validation:** Zod at the server action boundary
- **UI:** Tailwind CSS, shadcn/ui components
- **Testing:** Vitest

## Architecture

```
Client Component
      |
Server Action  -->  Zod schema (trust boundary)
      |
   Service (business logic + Prisma)
   /      \
Prisma   Domain utils (pure functions)
      |
  Database
```

- **Components** handle rendering only. No business logic.
- **Server actions** parse input with Zod and delegate to services.
- **Services** own business logic and database access.
- **Domain utils** are pure functions with no framework imports.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npx vitest run` | Run tests |
| `npx prisma migrate dev` | Apply migrations |
| `npx prisma generate` | Regenerate Prisma client |
| `npx prisma db seed` | Seed sample data |

## Project structure

```
app/
  layout.tsx            App shell with navigation
  patients/             List, create, detail, edit
  tests/                Lab test catalog (placeholder page)
  orders/               List, create, detail with status transitions
components/
  ui/                   shadcn/ui primitives (Button, Input, Table, etc.)
  shared/               Reusable composed components (FormField, DataTable, SearchInput, EmptyState, PageHeader)
lib/
  services/             Business logic + Prisma orchestration
  domain/               Pure functions (money, dates, order state machine, patient helpers)
  validations/          Zod schemas (patient, labTest, order)
  auth.ts               getCurrentUser() — single-user stub
  actionResult.ts       Shared ActionResult type
  db.ts                 Prisma client singleton
prisma/
  schema.prisma         Data model
  seed.ts               Development seed data
  migrations/           Schema migrations
docs/
  specs/                Feature specifications
```

## Feature status

- **Patients**: Complete — list with search, create via dialog, detail view, edit via dialog
- **Lab test catalog**: Backend complete (service layer, validation schemas, seed data), frontend is a placeholder page
- **Orders**: Complete — list with status filters and search, create with patient/test picker and live summary, detail with status transitions (Pending → In Progress → Completed), cancel with reason dialog

## Design decisions

- **SQLite** for zero-config local development. The schema is Postgres-compatible if migration is needed.
- **Integer cents** for all money fields. Dollar conversion happens at the action boundary (input) and component boundary (display).
- **Snapshot pattern** on order items. Price and turnaround time are frozen at order creation so catalog changes never affect existing orders.
- **Soft delete** for lab tests via an `active` flag. Historical orders still reference inactive tests.
- **No client-side data fetching.** Server Components fetch data; Server Actions handle mutations. Client-side state is limited to UI concerns (search filtering, form state).

## Trade-offs

- **Lab test catalog UI deferred.** The service layer, validation schemas, and seed data are fully built and tested. The frontend was deprioritized in favor of completing the full order lifecycle end-to-end, since orders are the core workflow.
- **Single-user authentication.** `getCurrentUser()` returns the first user in the database. A production system would need session management, a login flow, and role-based access control. The auth boundary is already isolated to one function, so the plumbing is upgrade-ready.
- **No pagination.** All list endpoints fetch every record. This is fine at take-home scale (tens of records). Production would need cursor-based pagination in the service layer and "load more" or infinite scroll in the UI.
- **SQLite.** Zero-config local development. The schema is Postgres-compatible. Order number generation relies on SQLite's single-writer serialization — a Postgres migration would need a sequence or `RETURNING` clause.
- **No client-side caching.** Server Components fetch fresh data on each navigation. For a staff tool with a small user base, this is simpler and correct. React Query or SWR would add complexity without a clear payoff at this scale.

## What I'd add with more time

- **Table sorting.** Column headers should be clickable to sort by name, date, status, or price. The `DataTable` component is already centralized, so the change would be isolated there.
- **Inline test creation during ordering.** Currently you pick from existing catalog items. A "quick add" flow in the order form would match real clinic workflows where a new test needs to be entered on the spot.
- **Bulk status transitions.** Labs process samples in batches — the UI should let staff select multiple orders and move them to In Progress or Completed at once.
- **Export to CSV/PDF.** Staff need to pull reports and hand paper summaries to patients. Order lists and patient records are the obvious starting points.
- **Order status notifications.** Email or in-app alerts when an order moves to Completed, so the ordering clinician doesn't have to poll the list.
- **Audit log.** Order status transitions are tracked, but a full audit trail (who changed what, when, across all entities) would be important for compliance in a clinical setting.
- **Optimistic UI with offline resilience.** Mutations currently wait for the server round-trip. Optimistic updates with rollback would make the app feel instant, and local caching would keep it usable on spotty clinic Wi-Fi.
- **Mobile-responsive layout.** Clinic staff often use tablets at workstations. The current layout is desktop-first.
- **Keyboard navigation.** Tab through the order creation flow without touching a mouse — important for high-volume data entry.
- **Page transitions.** Animated route transitions for smoother navigation between list and detail views.
