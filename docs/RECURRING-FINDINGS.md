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
- Occurrences: 2
- Last seen: 2026-09-10
- Files: `app/patients/PatientForm.tsx:8`, `app/tests/LabTestForm.tsx:10`
- Description: Manual entity types in form components don't track Prisma schema changes. Should derive from Prisma types.

### silent-action-result-discard

- Category: Domain Safety
- Occurrences: 1
- Last seen: 2026-09-10
- Files: `app/tests/LabTestList.tsx:101-109`
- Description: Server action return value (ActionResult) discarded without checking. Failed mutations show no error feedback to the user.

### catch-all-as-404

- Category: Correctness
- Occurrences: 1
- Last seen: 2026-09-10
- Files: `app/patients/[id]/page.tsx:21`
- Description: Bare `catch { notFound() }` masks DB connection errors as 404s. Should narrow to P2025.

## Resolved

(None yet)
