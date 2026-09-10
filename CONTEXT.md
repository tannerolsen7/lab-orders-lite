# CONTEXT.md

Product context, domain model, scope, and decisions for Lab Orders Lite.
For process rules and coding discipline see [CLAUDE.md](CLAUDE.md).

---

## What this project is

A staff-facing tool for ordering lab tests for patients. Staff register patients, manage a
catalog of available lab tests (with pricing and turnaround times), and create orders that
snapshot the current catalog pricing at the time of submission.

This is a take-home project for Enzo Health. The goal is a polished core that demonstrates
code organization, architecture decisions, and testing discipline — not feature completeness.

---

## Domain model

### Entities

| Entity | Purpose | Key fields |
|--------|---------|------------|
| Patient | Person receiving lab work | firstName, lastName, dateOfBirth, phone?, email? |
| LabTest | Catalog item that can be ordered | code (unique), name, priceCents, turnaroundHours, active |
| Order | Request to run tests for a patient | orderNumber (auto-increment), patientId, status, createdById, updatedById? |
| OrderItem | One test within an order (frozen pricing) | orderId, labTestId, priceCentsSnapshot, turnaroundHoursSnapshot |
| User | Staff member (stubbed) | name |

### Relationships

- Order → Patient (many-to-one, `onDelete: Restrict`)
- Order → User via `createdById` (many-to-one)
- Order → User via `updatedById` (many-to-one, nullable — set on status transitions)
- OrderItem → Order (many-to-one, `onDelete: Cascade`)
- OrderItem → LabTest (many-to-one, `onDelete: Restrict`)
- Patient → User via `updatedById` (many-to-one, nullable)
- LabTest → User via `createdById` (many-to-one)
- LabTest → User via `updatedById` (many-to-one, nullable)

### Invariants

- An order must have at least one test.
- All tests in an order must be active at creation time.
- Prices are snapshotted at order creation — catalog changes never affect existing orders.
- An order's patient, tests, and snapshotted prices are immutable after creation. Only the status can change.
- `cancelReason` is required when status = CANCELLED, null for all other statuses.
- Lab tests are never hard-deleted — they are retired (`active = false`).
- A retired test's code is still reserved (unique across active and inactive).
- Lab test `code` is immutable after creation.

---

## Order status state machine

```
PENDING → IN_PROGRESS → COMPLETED
   ↓           ↓
CANCELLED   CANCELLED
```

| From | Allowed transitions |
|------|-------------------|
| PENDING | IN_PROGRESS, CANCELLED |
| IN_PROGRESS | COMPLETED, CANCELLED |
| COMPLETED | (terminal) |
| CANCELLED | (terminal) |

Transitions are stored as a lookup table: `Record<OrderStatus, OrderStatus[]>`.
`canTransition(from, to)` is a pure function in `lib/domain/order.ts`.
Terminal states have `[]` as their allowed-next.

---

## Computed fields (not materialized)

| Field | Computation | Where |
|-------|-------------|-------|
| Total cost | Sum of `priceCentsSnapshot` across order items | `lib/domain/order.ts` → `computeTotalCents()` |
| Estimated ready date | `orderCreatedAt` + max `turnaroundHoursSnapshot` across items | `lib/domain/order.ts` → `computeEstimatedReadyDate()` |

These are computed on read, not stored. At this scale, the cost is negligible. Would materialize
at 1M+ orders.

---

## Auth approach

Stubbed. A seeded `User` row ("Dr. Test") is returned by `getCurrentUser()`. No session, no JWT.
Migration path to real auth = swap one function call. Mentioned in README as a deliberate scope cut.

---

## Scope

### In scope

- Patients: create, edit, list with client-side search (first or last name)
- Lab tests: create, edit, list with client-side search (code + name), retire, reactivate
- Orders: create (patient + N tests, transactional insert with snapshotting), detail view, list with filters (patient name client-side, status server-side), status transitions with state machine
- Shared primitives: FormField, DataTable (card layout on mobile), SearchInput, EmptyState, money formatting, date formatting
- Full responsive design: 76px sidebar icon rail on desktop, bottom tab bar on mobile; tables convert to cards; modals go full-screen on mobile
- Dashboard stat cards on patients list (Total Patients, Active Orders, Pending Results, Revenue This Month)

### Out of scope (README "what I'd add with more time")

- Real authentication and authorization
- Pagination (demo scale)
- Order editing after creation
- Email/notifications on status change
- Price history / audit trail (`LabTestPriceHistory` table)
- Test categories, panels, or grouping
- Config-driven form generator (3 forms with different behavior — shared components over abstraction at this scale)
- Offline support (service worker caching, optimistic UI, queue-and-sync for field environments)
- Dark mode
- Duplicate patient detection
- Server-side search (client-side is instant at demo scale)

---

## Seed data

See seed data details in each feature spec:
- `docs/specs/patients.md` — 3 patients
- `docs/specs/lab-tests.md` — 6 lab tests with prices and turnaround times
- `docs/specs/orders.md` — 3 orders in different statuses

---

## Resolved decisions

| Decision | Resolution | Why |
|----------|-----------|-----|
| Stack | Next.js App Router + Prisma + SQLite + shadcn/ui | Full-stack in one repo, fast to scaffold, likely matches Enzo's stack |
| Money storage | Integer cents | Floats lose precision; `0.1 + 0.2 !== 0.3` |
| Order immutability | Patient, tests, prices frozen after creation | Simplifies the model; editing would need re-snapshotting + audit trail |
| Soft delete vs hard delete for tests | Soft delete (`active` flag) | FK constraints prevent hard delete; retired tests still visible in order history |
| Search approach | Client-side filtering | Demo scale; upgrade path to server-side documented in specs |
| Form architecture | Shared components (FormField, etc.) over config-driven | 3 forms with different behavior; abstraction not justified at this scale |
| cancelReason enforcement | Zod `refine` + service validation enforce `cancelReason` only on cancelled; DB uses nullable column | Simple validation over a discriminated union type — clearer for a take-home |
| Totals | Computed on read, not materialized | Negligible cost at demo scale |
| Navigation | 76px sidebar icon rail (desktop), bottom tab bar (mobile) | Design system chose sidebar; better use of vertical space for data-heavy tables |
| Order numbering | Auto-increment `orderNumber` for display, CUID stays as PK/URL param | Clinics reference orders by human-readable number, not system IDs |
| Lab test code immutability | Code is read-only after creation | Code is a natural key referenced in order history; changing it would break human references |

---

## Rejected patterns

| Pattern | Why rejected |
|---------|-------------|
| Config-driven form generator | Over-engineering for 3 forms. Revisit at 10+ entities. |
| Materialized totals column on Order | Introduces write complexity and drift risk for zero read benefit at this scale. |
| Hard-deleting lab tests | FK constraints prevent it. Soft delete is the standard pattern for reference data. |
| JWT auth | Adds complexity for a demo with one user. Session auth would be the first real auth step. |
| Server-side search | Client-side is instant at demo scale. Server-side is the upgrade path, not the starting point. |
