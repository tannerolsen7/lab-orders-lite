# Enzo Health — Project Decisions

All decisions made during the strategy phase. Reference card for building.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js App Router + TypeScript | Full-stack in one repo, server actions for forms, likely matches Enzo's stack |
| ORM | Prisma | Schema-first, typesafe, migration files as audit trail |
| Database | SQLite (dev) | Zero config, swap-a-line to Postgres for prod |
| UI | shadcn/ui + Tailwind | Components you own (copied into repo, not a dependency), CSS variable theming |
| Testing | Vitest (unit + integration) + one Playwright happy-path | |
| Validation | Zod at trust boundaries only | Server actions, route handlers — never inside services |
| IDs | CUID (`@default(cuid())`) | URL-safe, no DB coordination, don't leak row counts |

## Delivery / Git

- GitHub repo
- Feature branches → PRs into `dev`
- Single `dev` → `main` promotion PR at submission
- Thin PRs (~10): scaffold · data model · UI primitives · patients · tests · orders create · status machine · list+filters · testing · README
- Seed data: yes, ~3 patients + ~6 lab tests via `prisma db seed`

## Data Model

### Models

```
Patient       (id, firstName, lastName, dateOfBirth, phone, email, updatedById?, createdAt, updatedAt)
LabTest       (id, code, name, priceCents, turnaroundHours, active, updatedById?, createdAt, updatedAt)
Order         (id, orderNumber (auto-increment), patientId, status, cancelReason?, createdById, updatedById?, createdAt, updatedAt)
OrderItem     (id, orderId, labTestId, priceCentsSnapshot, turnaroundHoursSnapshot, createdAt)
User          (id, name) — stub table for seeded "Dr. Test"
```

### Relationships
- Order → Patient (many-to-one, `onDelete: Restrict`)
- Order → User via `createdById` (many-to-one)
- Order → User via `updatedById` (many-to-one, nullable — set on status transitions)
- OrderItem → Order (many-to-one, `onDelete: Cascade` — items die with order)
- OrderItem → LabTest (many-to-one, `onDelete: Restrict`)
- Patient → User via `updatedById` (many-to-one, nullable)
- LabTest → User via `updatedById` (many-to-one, nullable)

### Key conventions
- Money = integer cents everywhere (`priceCents: Int`), format at display only
- Timestamps = UTC ISO strings, format to local TZ at display
- Order line items: snapshot `priceCents` and `turnaroundHours` from LabTest at insert time — frozen forever
- Soft delete for LabTest: `active: Boolean @default(true)`, filter in "create new" picker, never hard-delete
- Totals computed live (not materialized) — would materialize at 1M+ orders

## Scope

### In scope
- Patients CRUD (create, edit, list)
- Lab test catalog CRUD (create, edit, list, soft-delete/retire)
- Create order (pick patient + N tests, snapshot prices, transactional insert)
- Display total cost (sum of snapshotted prices) + estimated ready date (max turnaround)
- Order list with filter/search (by patient, by status)
- Order status state machine with transitions

### Out of scope (mention in README as "would add with more time")
- Real auth (stub with seeded user)
- Pagination (not needed at demo scale)
- Order editing after creation
- Email/notifications
- Price history / audit trail (discussed in interview prep, not implementing)

## Order Status State Machine

- Enum: `PENDING → IN_PROGRESS → COMPLETED` plus `CANCELLED` (terminal)
- Transitions stored as lookup table: `Record<Status, Status[]>`
- `canTransition(from, to)` = pure function in domain utils, unit-testable
- Terminal states have `[]` as allowed-next
- `cancelReason` required when status = CANCELLED (enforced by Zod refine + service validation, nullable column in DB)

## Architecture / Layering

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

- Read-only pages collapse to: Server Component → Service → Prisma
- Each layer talks only to the layer below
- Business logic lives ONLY in services
- DB access ONLY from services
- Zod parsing at outermost boundary, never inside services
- Components never import Prisma

## Decision Priority

All decisions evaluated through two lenses, in order:
1. What's the absolute best user experience?
2. What's the most maintainable, extendable, understandable code?

UX lens comes first. Code quality serves the user, not the other way around.

## Create/Edit UI Pattern

- **Patients & Lab tests:** URL-reachable modals (Dialog) via App Router intercepting routes. Staff stay in context on the list page. `/patients/new`, `/patients/[id]/edit`, `/tests/new`, `/tests/[id]/edit` all overlay the list. Browser back closes the modal. Hard refresh still works.
- **Orders:** Dedicated create page at `/orders/new` — form has enough surface area (patient dropdown, test checkboxes, running total, estimated ready date) that a modal would feel cramped.

## Folder Structure (planned)

```
app/
  patients/         — pages + server actions + intercepting route modals
  tests/            — pages + server actions + intercepting route modals (lab test catalog)
  orders/           — pages + server actions
  api/              — route handlers (if needed for external callers)
lib/
  services/         — business logic (patients, labTests, orders)
  domain/           — pure functions (money formatting, date calc, state machine)
  db.ts             — Prisma client singleton
  validations/      — Zod schemas
components/
  ui/               — shadcn primitives
  [feature]/        — feature-specific client components
prisma/
  schema.prisma
  seed.ts
  migrations/
```

## Auth Approach

- Stub: seeded `User` row ("Dr. Test"), hardcoded in a `getCurrentUser()` function
- No session, no JWT — just returns the seeded user
- Migration path to real auth = swap one function call
- Mention in README as deliberate scope cut

## Design Upgradeability (shadcn)

- CSS variables for tokens in `globals.css` (`--primary`, `--radius`, etc.)
- Swap values → whole app rethemes without touching components
- No design system lock-in — components are owned source code, not a package

## Interview Talking Points (prepared)

- shadcn is not a library, it's owned source — explain the copy model
- "Parse, don't validate" — Zod at boundaries, trust inputs inside
- Snapshotting pattern — standard in commerce/billing, explain why order items freeze prices
- State machine as data — lookup table vs scattered if/switch
- Why integer cents — `0.1 + 0.2 !== 0.3`
- Discriminated union for order status — `cancelReason` only accessible in cancelled branch
- Order numbering — auto-increment for human display, CUID for URLs
- Lab test code immutability — natural key, read-only after creation
- Sidebar nav — 76px icon rail desktop, bottom tab bar mobile
