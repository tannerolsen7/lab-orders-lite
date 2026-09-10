# Patients

> **Status: DRAFT** — awaiting human approval.
> Size: Small (straightforward CRUD, no complex business logic).

---

## What & Why

Patients are the people receiving lab work. Every order must reference a patient. Staff need to register patients before ordering tests, look up existing patients by name, and update contact info when it changes.

## Context

- `prisma/schema.prisma` — Patient model definition and relationships.
- `docs/specs/scaffold.md` — shared primitives (FormField, DataTable, SearchInput, formatDate, EmptyState, app shell). This feature composes from those, not builds its own.
- `docs/specs/orders.md` — Order references Patient via FK (`onDelete: Restrict`), so the DB prevents deletion of patients with orders.
- Auth is stubbed — the seeded "Dr. Test" user is the implicit actor for all operations (see `docs/specs/scaffold.md`).

## Done Looks Like

- A list page at `/patients` showing all patients (name, DOB, contact info) with a search input that filters by first or last name client-side as the user types.
- A create modal (Dialog) at `/patients/new` — intercepting route overlays the modal on the list page. Staff stay in context. URL is shareable and browser back closes the modal.
- An edit modal (Dialog) at `/patients/[id]/edit` — intercepting route overlays the modal on the list page, pre-filled with the patient's current data.
- A detail view showing patient info and (once orders exist) their order history.
- Service layer with `create`, `update`, `list`, `getById` — no direct Prisma calls from actions or components.
- Zod validation at the server action boundary.
- Seed data: 3 patients with realistic names, varied DOBs, mix of contact methods.
- `npx tsc --noEmit` and all tests green.

## Interface Contract

**Prisma model:**
```prisma
model Patient {
  id            String   @id @default(cuid())
  firstName     String
  lastName      String
  dateOfBirth   DateTime
  phone         String?
  email         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  updatedById   String?
  updatedBy     User?    @relation(fields: [updatedById], references: [id])
  orders        Order[]
}
```
`updatedById` is nullable because seed data and initial creation have no prior updater. Set on every update via the service layer.

**Zod boundary** — `lib/validations/patient.ts`:
```ts
export const PatientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dateOfBirth: z.string().date(), // ISO date string; past-date check runs in the service via domain util
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().email().trim().optional().or(z.literal("")),
}).refine(
  (data) => data.phone || data.email,
  { message: "At least one contact method (phone or email) is required" }
)
```

**Service** — `lib/services/patients.ts`:
- `list()` — returns all patients, ordered by last name. No server-side filtering — search is client-side at this scale.
- `getById(id: string)` — returns patient or throws.
- `create(data: PatientInput, createdById: string)` — validates DOB is in past via domain util, creates row.
- `update(id: string, data: PatientInput, updatedById: string)` — validates DOB is in past via domain util, updates row and sets `updatedById`.

**Server actions** — `app/patients/actions.ts`:
- `createPatient(formData)` — parses with Zod, calls service, redirects to patient list.
- `updatePatient(id, formData)` — parses with Zod, calls service, revalidates path.

**Domain utils** — `lib/domain/patient.ts`:
- `isDateInPast(date: string): boolean` — pure function.
- `formatPatientName(patient: { firstName: string, lastName: string }): string` — "Last, First" for table display.

## Constraints

- No deleting patients. They're reference data pointed at by orders. The DB enforces this via `onDelete: Restrict` on Order → Patient.
- No duplicate detection or merging.
- No address fields — out of scope for a lab ordering demo.
- Phone format is not strictly validated (different countries, extensions, etc.) — just non-empty string if provided.

## State

Search input is client-side state in a Client Component that filters the server-fetched list. Form inputs use server actions — no client-side fetch/loading state needed for mutations. Server is the source of truth for data.

## Out of Scope — Cut & Why

| Cut | Why |
|---|---|
| Patient portal / patient-facing login | Auth is out of scope for the entire app — this is a staff-facing tool. |
| Server-side search | Client-side filtering is instant at demo scale. Would move to a server-side `where` clause with Prisma's `contains` when row count makes shipping all rows to the client impractical. |
| Pagination | Demo scale (~3 seeded patients). Would add server-side cursor pagination for production. |
| Patient photo or avatar | No clinical value for a lab ordering system. |
| Address / insurance / demographics | Real EMRs need these. Cut to keep the entity focused on what orders actually reference (name, DOB, contact). Would add as a follow-up. |
| Duplicate patient detection | Important for production (name + DOB matching). Cut because it's a feature in itself — fuzzy matching, merge workflows, conflict resolution. |
| Deleting or archiving patients | Patients with orders can't be deleted (FK constraint). Patients without orders could be, but there's no user need for it at this scale. Would add soft-delete if the registry grew large enough to need cleanup. |
