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
| `npx prisma db seed` | Seed sample data |

## Project structure

```
app/                  Pages and server actions
  patients/           Patient management
  tests/              Lab test catalog
  orders/             Lab orders
components/
  ui/                 shadcn/ui primitives
  shared/             Reusable composed components
lib/
  services/           Business logic + Prisma
  domain/             Pure functions
  validations/        Zod schemas
prisma/
  schema.prisma       Data model
  seed.ts             Development seed data
docs/
  specs/              Feature specifications
```

## Design decisions

- **SQLite** for zero-config local development. The schema is Postgres-compatible if migration is needed.
- **Integer cents** for all money fields. Dollar conversion happens at the action boundary (input) and component boundary (display).
- **Snapshot pattern** on order items. Price and turnaround time are frozen at order creation so catalog changes never affect existing orders.
- **Soft delete** for lab tests via an `active` flag. Historical orders still reference inactive tests.
- **No client-side data fetching.** Server Components fetch data; Server Actions handle mutations. Client-side state is limited to UI concerns (search filtering, form state).
