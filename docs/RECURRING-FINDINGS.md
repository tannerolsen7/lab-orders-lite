# Recurring Findings

Findings that appear across multiple code reviews. Active items are tracked for promotion
to PITFALLS.md or ADRs when they reach 3+ occurrences.

## Active

### dob-timezone-round-trip

- Category: Domain Safety
- Occurrences: 1
- Last seen: 2026-09-10
- Files: `lib/services/patients.ts:21`, `lib/domain/patient.ts:2`
- Description: Date-only fields parsed with `new Date(str + "T00:00:00")` (local time) then read back via `toISOString()` (UTC) can shift by a day. Fixed by appending `Z` for UTC.

### raw-error-leak

- Category: Domain Safety
- Occurrences: 1
- Last seen: 2026-09-10
- Files: `app/patients/actions.ts:33`
- Description: Service/Prisma error messages forwarded verbatim to client UI via `e.message`. Fixed by allow-listing known business error messages.

### hand-rolled-type-drift

- Category: TS Discipline
- Occurrences: 1
- Last seen: 2026-09-10
- Files: `app/patients/PatientForm.tsx:8`
- Description: Manual `Patient` type in component doesn't track Prisma schema changes. Should derive from Prisma types.

### catch-all-as-404

- Category: Correctness
- Occurrences: 1
- Last seen: 2026-09-10
- Files: `app/patients/[id]/page.tsx:21`
- Description: Bare `catch { notFound() }` masks DB connection errors as 404s. Should narrow to P2025.

### suspense-missing-fallback

- Category: Correctness
- Occurrences: 1
- Last seen: 2026-09-10
- Files: `app/orders/page.tsx:23`, `app/patients/page.tsx:10`, `app/orders/[id]/page.tsx:14`, `app/patients/[id]/page.tsx:20`
- Description: Inner `<Suspense>` with no `fallback` intercepts suspension before the route-level `loading.tsx` boundary, rendering blank instead of skeleton. Fixed by adding explicit fallback props.

### usememo-wall-clock-dependency

- Category: Correctness
- Occurrences: 1
- Last seen: 2026-09-10
- Files: `app/orders/new/OrderCreateForm.tsx:78`
- Description: `useMemo` wrapping `new Date()` freezes the timestamp at memo-creation time instead of using a fresh value each render. Fixed by reverting to direct computation.

## Resolved

(None yet)
