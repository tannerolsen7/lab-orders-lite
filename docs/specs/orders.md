# Orders

> **Status: DRAFT** — awaiting human approval.
> Size: Medium (multi-step creation, snapshotting, state machine, computed fields, list with filters).

---

## What & Why

An order is a request to run one or more lab tests for a patient. This is the core transaction of the app — it ties patients to tests, freezes pricing at the moment of ordering, tracks progress through a state machine, and gives staff a filterable list to manage their workload.

## Context

- `prisma/schema.prisma` — Order, OrderItem model definitions and relationships.
- `docs/specs/scaffold.md` — shared primitives (FormField, DataTable, SearchInput, centsToDollars, EmptyState, app shell).
- `docs/specs/patients.md` — Order references Patient via FK. Patient must exist before an order can be created.
- `docs/specs/lab-tests.md` — OrderItem references LabTest via FK. Only active tests appear in the order creation picker. Price and turnaround hours are snapshotted at creation — catalog changes never affect existing orders.

## Done Looks Like

- A create page at `/orders/new` where the user selects a patient, picks one or more active lab tests, sees a running total and estimated ready date, and submits.
- Simple form layout: patient dropdown, test checkboxes, summary section showing total and estimated ready date. No multi-step wizard, no autocomplete, no drag-and-drop.
- On submit: all order items are inserted in a single transaction with snapshotted prices and turnaround hours from the lab test catalog at that moment.
- An order detail page at `/orders/[id]` showing patient info, line items with snapshotted prices, total cost, estimated ready date, current status, and available status transitions. The page clearly communicates that the order cannot be modified after creation (e.g. "Tests and pricing are locked once an order is submitted").
- A list page at `/orders` showing all orders with patient name, status, total, created date — filterable by patient name and by status.
- Status transitions enforced by a state machine: only valid transitions are available as actions on the detail page.
- Cancelling an order requires a reason.
- Service layer with `create`, `getById`, `list`, `updateStatus` — no direct Prisma calls from actions or components.
- Zod validation at the server action boundary.
- Domain utils for state machine, total calculation, and ready date calculation are pure functions with unit tests.
- `npx tsc --noEmit` and all tests green.

## Interface Contract

**Prisma models:**
```prisma
enum OrderStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model Order {
  id            String      @id @default(cuid())
  patientId     String
  patient       Patient     @relation(fields: [patientId], references: [id])
  status        OrderStatus @default(PENDING)
  cancelReason  String?
  createdById   String
  createdBy     User        @relation(fields: [createdById], references: [id])
  updatedById   String?
  updatedBy     User?       @relation(fields: [updatedById], references: [id])
  items         OrderItem[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```
`updatedAt` and `updatedById` track status transitions — the only mutation allowed after creation. The order's patient, tests, and snapshotted prices are immutable. `updatedById` is nullable because a newly created order has no updater yet.

```prisma
model OrderItem {
  id                      String   @id @default(cuid())
  orderId                 String
  order                   Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  labTestId               String
  labTest                 LabTest  @relation(fields: [labTestId], references: [id])
  priceCentsSnapshot      Int
  turnaroundHoursSnapshot Int
  createdAt               DateTime @default(now())
}
```

**Zod boundaries** — `lib/validations/order.ts`:
```ts
export const CreateOrderSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  labTestIds: z.array(z.string()).min(1, "At least one test is required"),
})

export const UpdateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  cancelReason: z.string().trim().min(1, "Cancel reason is required").optional(),
}).refine(
  (data) => data.status !== "CANCELLED" || data.cancelReason,
  { message: "Cancel reason is required when cancelling" }
)
```

**Service** — `lib/services/orders.ts`:
- `create(data: { patientId, labTestIds, createdById })` — validates patient exists, validates all tests exist and are active, snapshots prices and turnaround hours, creates Order + OrderItems in a `$transaction`.
- `getById(id: string)` — returns order with items, patient, and lab test details (for display names). Throws if not found.
- `list(filters?: { patientName?: string, status?: OrderStatus })` — returns all orders with patient name and item count. Client-side filtering by patient name; status filter applied server-side (it's an enum match, not a text search).
- `updateStatus(id: string, status: OrderStatus, updatedById: string, cancelReason?: string)` — validates transition is allowed via domain util, updates status and `updatedById`. Sets `cancelReason` if cancelling. Throws on invalid transition.

**Server actions** — `app/orders/actions.ts`:
- `createOrder(formData)` — parses with Zod, calls service, redirects to new order's detail page.
- `updateOrderStatus(id, formData)` — parses with Zod, calls service, revalidates path.

**Domain utils** — `lib/domain/order.ts`:

State machine:
- `ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]>` — the lookup table.
  - `PENDING → [IN_PROGRESS, CANCELLED]`
  - `IN_PROGRESS → [COMPLETED, CANCELLED]`
  - `COMPLETED → []` (terminal)
  - `CANCELLED → []` (terminal)
- `canTransition(from: OrderStatus, to: OrderStatus): boolean` — pure function.
- `getAvailableTransitions(status: OrderStatus): OrderStatus[]` — returns allowed next states for UI buttons.

Computed fields:
- `computeTotalCents(items: { priceCentsSnapshot: number }[]): number` — sum of snapshotted prices.
- `computeEstimatedReadyDate(orderCreatedAt: Date, items: { turnaroundHoursSnapshot: number }[]): Date` — `orderCreatedAt` + max turnaround hours across all items.

The `cancelReason` invariant (required when CANCELLED, null otherwise) is enforced by the Zod `UpdateStatusSchema` refine and a simple check in the service's `updateStatus`. No separate domain type needed — the Zod schema and service validation are the enforcement layer.

## Constraints

- An order must have at least one test.
- All tests in an order must be active at creation time. If a test is retired between page load and submit, the service rejects the order.
- Prices are snapshotted at creation. If a test's price changes between page load and submit, the *current* price at submit time is what gets snapshotted — not the stale price the user saw on screen. The UI should reflect this (show the snapshotted prices on the confirmation/detail page, not the catalog prices).
- Orders cannot be edited after creation (no adding/removing tests, no changing patient).
- Status transitions are enforced in the service layer via the domain state machine. Invalid transitions return an error.
- `cancelReason` is required when transitioning to CANCELLED and must be non-empty.
- `cancelReason` is `null` for all non-cancelled orders.
- Deleting an order cascades to its items (`onDelete: Cascade`). However, order deletion is not exposed in the UI — it exists only as a DB-level safety net.

## State

Order creation form has client-side state: selected patient, selected tests, running total preview, and estimated ready date preview. These are computed from the current catalog and shown as a preview — the actual snapshotted values come from the server at submit time.

Status transition buttons on the detail page use server actions — no client-side state beyond the cancel reason input.

## Out of Scope — Cut & Why

| Cut | Why |
|---|---|
| Order editing after creation | Once submitted, an order is immutable (except status). Editing would require re-snapshotting prices, partial cancellation logic, and audit trail — each a feature in itself. |
| Bulk order creation | One order at a time. Bulk would need a CSV import or batch API. |
| Order assignment to staff | No concept of "assigned to" for processing. Orders track who created them, but there's no workflow for assigning an order to a specific staff member to fulfill. Would add an assignment system with a queue and workload view. |
| Due date / priority | Estimated ready date is derived from turnaround hours. No manual priority or due date override. |
| Notifications on status change | No email, SMS, or in-app notification. Would add for production. |
| Print / export order | No PDF generation or print view. Would add for clinics that need paper records. |
| Server-side patient name filter | Status filter is server-side (enum match). Patient name filter is client-side at demo scale. Would move server-side with a JOIN + `contains` query at scale. |
| Offline order creation | Important for field environments with poor connectivity. Would add service worker caching, optimistic UI, and a queue-and-sync pattern. Mentioned in README as a consideration given clinical deployment environments. |

## Seed Data

2-3 orders in different statuses so the list page isn't empty on first run:

| Patient | Tests | Status | Notes |
|---|---|---|---|
| Seeded patient 1 | CBC, Lipid Panel | COMPLETED | Shows a finished order with total and ready date in the past |
| Seeded patient 2 | TSH, HBA1C, Vitamin D | IN_PROGRESS | Shows an active order with multiple tests |
| Seeded patient 1 | Urinalysis | CANCELLED | Shows a cancelled order with a cancel reason |
