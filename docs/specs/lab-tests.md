# Lab Tests

> **Status: DRAFT** — awaiting human approval.
> Size: Small (CRUD + soft delete, no complex business logic).

---

## What & Why

Lab tests are the catalog of available tests that can be ordered for a patient (e.g. CBC, Lipid Panel, Vitamin D). Staff need to manage this catalog — add new tests, update pricing or turnaround times, and retire tests that are no longer offered without breaking historical orders that reference them.

## Context

- `prisma/schema.prisma` — LabTest model definition and relationships.
- `docs/specs/scaffold.md` — shared primitives (FormField, DataTable, SearchInput, centsToDollars, dollarsToCents, EmptyState, app shell). This feature composes from those, not builds its own.
- `docs/specs/orders.md` — OrderItem references LabTest via FK (`onDelete: Restrict`). Price and turnaround hours are snapshotted onto OrderItem at order creation — changes to the catalog never affect existing orders.
- Each test has a unique `code` (e.g. "CBC", "LIPID", "VITD") used as a human-readable identifier alongside the system-generated CUID.

## Done Looks Like

- A list page at `/tests` showing all active lab tests (code, name, price, turnaround time) with a client-side search input that filters by code or name as the user types.
- A toggle or filter to show retired (inactive) tests alongside active ones.
- A create modal (Dialog) opened via `?action=new` query param — overlays the modal on the list page. Staff stay in context.
- An edit modal (Dialog) opened via `?edit=<id>` query param — overlays the modal on the list page, pre-filled with the test's current data.
- A retire action that sets `active = false` — no hard delete.
- A reactivate action that sets `active = true` — a retired test can be brought back.
- Price displayed as dollars throughout the UI, stored as integer cents in the DB.
- Service layer with `create`, `update`, `list`, `getById`, `retire`, `reactivate` — no direct Prisma calls from actions or components.
- Zod validation at the server action boundary.
- Seed data: ~6 tests with realistic codes, names, prices, and turnaround times (e.g. CBC $30 24h, Lipid Panel $45 48h, Urinalysis $20 12h).
- `npx tsc --noEmit` and all tests green.

## Interface Contract

**Prisma model:**
```prisma
model LabTest {
  id              String      @id @default(cuid())
  code            String      @unique
  name            String
  priceCents      Int
  turnaroundHours Int
  active          Boolean     @default(true)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  createdById     String
  createdBy       User        @relation(fields: [createdById], references: [id])
  updatedById     String?
  updatedBy       User?       @relation(fields: [updatedById], references: [id])
  orderItems      OrderItem[]
}
```
`createdById` is required — set on creation via the service layer. `updatedById` is nullable because initial creation has no prior updater. Set on every update (including retire/reactivate) via the service layer.

**Zod boundary** — `lib/validations/lab-test.ts`:
```ts
export const LabTestSchema = z.object({
  code: z.string().trim().min(1, "Code is required").toUpperCase(),
  name: z.string().trim().min(1, "Name is required"),
  priceDollars: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price").refine(
    (val) => parseFloat(val) > 0, "Price must be greater than zero"
  ),
  turnaroundHours: z.coerce.number().int().positive("Turnaround time must be a positive whole number"),
})
```
Note: `priceDollars` is a string from the form input. The server action converts to cents before passing to the service.

**Service** — `lib/services/lab-tests.ts`:
- `list(includeInactive?: boolean)` — returns active tests by default, ordered by name. Pass `true` to include retired tests.
- `getById(id: string)` — returns test or throws. Includes inactive tests (needed for order history display).
- `create(data: LabTestInput, createdById: string)` — creates row. Throws if `code` already exists (unique constraint).
- `update(id: string, data: LabTestInput, updatedById: string)` — updates name, price, and turnaround. Code is immutable after creation — the update input excludes it. Sets `updatedById`. Throws if test not found.
- `retire(id: string, updatedById: string)` — sets `active = false` and `updatedById`.
- `reactivate(id: string, updatedById: string)` — sets `active = true` and `updatedById`.

**Server actions** — `app/tests/actions.ts`:
- `createLabTest(formData)` — parses with Zod, converts dollars to cents, calls service, redirects to test list.
- `updateLabTest(id, formData)` — parses with Zod, converts dollars to cents, calls service, revalidates path.
- `retireLabTest(id)` — calls service, revalidates path.
- `reactivateLabTest(id)` — calls service, revalidates path.

**Domain utils** — `lib/domain/money.ts`:
- `dollarsToCents(dollars: string): number` — parses dollar string to integer cents. `"30.00"` → `3000`. Rounds to nearest cent for inputs like `"30.005"`.
- `centsToDollars(cents: number): string` — formats integer cents as dollar string for display. `3000` → `"30.00"`.

## Constraints

- No deleting lab tests. They're reference data pointed at by order items. The DB enforces this via `onDelete: Restrict` on OrderItem → LabTest. Retire instead.
- `code` must be unique across all tests (active and inactive). A retired test's code is still reserved.
- `code` is immutable after creation — the edit modal shows it as a read-only field.
- Price must be positive (no free tests, no negative prices).
- Turnaround hours must be a positive integer.

## State

Search input is client-side state in a Client Component that filters the server-fetched list. Active/inactive toggle is also client-side state. Form inputs use server actions. Server is the source of truth for data.

## Out of Scope — Cut & Why

| Cut | Why |
|---|---|
| Server-side search | Client-side filtering is instant at demo scale (~6 tests). Would move to server-side `where` clause when catalog grows large. |
| Pagination | Demo scale. Would add for production. |
| Price history / audit trail | Discussed during interview prep. Important for compliance — would add a `LabTestPriceHistory` table (see study notes). Cut because it's a feature in itself. |
| Test categories or grouping | Real lab systems group tests (e.g. Hematology, Chemistry). Cut to keep the catalog flat and simple. |
| Test panels (bundled tests) | A panel like "Basic Metabolic Panel" is really a group of individual tests sold together. Would model as a many-to-many with a `Panel` entity. Cut for scope. |
| Bulk import/export | Real catalogs are managed via CSV or integration. Not needed for a demo. |
| Currency selection | All prices in USD. Would parameterize for multi-currency. |

## Seed Data

| Code | Name | Price | Turnaround |
|---|---|---|---|
| CBC | Complete Blood Count | $30.00 | 24h |
| LIPID | Lipid Panel | $45.00 | 48h |
| VITD | Vitamin D, 25-Hydroxy | $55.00 | 72h |
| UA | Urinalysis | $20.00 | 12h |
| TSH | Thyroid Stimulating Hormone | $40.00 | 36h |
| HBA1C | Hemoglobin A1c | $35.00 | 24h |
