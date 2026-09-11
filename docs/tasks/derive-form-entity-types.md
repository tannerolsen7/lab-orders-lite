## TASK
Replace the manual `Patient` type in `PatientForm.tsx` with a Prisma-derived type so form component types track schema changes at compile time.

## SUCCESS CRITERIA
- [ ] `PatientForm.tsx` exports a `Patient` type derived via `Pick<>` from `@prisma/client`'s `Patient`
- [ ] No manual field definitions for entity types in form components
- [ ] `PatientList.tsx` and `PatientDetailEdit.tsx` continue to compile without changes
- [ ] Type guard test in `PatientForm.typecheck.test.ts` still passes
- [ ] `npx tsc --noEmit` exits zero
- [ ] `npx vitest run` all green
- [ ] `npm run build` succeeds

## SCOPE
In scope:
- `app/patients/PatientForm.tsx` — replace manual type with `Pick<Patient, ...>` from `@prisma/client`

Out of scope (do not touch):
- Service layer, domain utils, Zod schemas
- Any component logic or rendering
- Prisma schema

## CONSTRAINTS
- Use `import type` only — no runtime Prisma imports in client components
- Do not change the set of fields exposed by the type (id, firstName, lastName, dateOfBirth, phone, email)
- Do not refactor consumers — they should work without changes

## ROOT CAUSE
`app/patients/PatientForm.tsx:9-16` defines a manual 6-field `Patient` type that duplicates
a subset of the Prisma `Patient` model. The type is structurally correct today, but it is
disconnected from the schema source of truth. If the Prisma schema changes (field rename,
type change, field removal), the manual type won't reflect the change. TypeScript's structural
typing means some mismatches would surface at the page boundary (where `patientService.list()`
return type meets the manual type), but this coupling is indirect and fragile.

## OPEN QUESTIONS
None — the fix is mechanical.

## REFERENCES
- Root cause: `app/patients/PatientForm.tsx:9-16`
- Type guard test: `app/patients/PatientForm.typecheck.test.ts`
- Consumers: `app/patients/PatientList.tsx:19`, `app/patients/[id]/PatientDetailEdit.tsx:14`
- Prisma schema: `prisma/schema.prisma` (Patient model)

## SIZE ESTIMATE
[x] Tiny

## PRE-GRILL
1. What does this need to do, and why is it structured this way?
   Replace `export type Patient = { id: string; ... }` with
   `export type Patient = Pick<PrismaPatient, "id" | "firstName" | "lastName" | "dateOfBirth" | "phone" | "email">`.
   This makes the compiler enforce field-name and field-type consistency with the schema.

2. Where could this fail?
   Only risk: if `import type { Patient } from "@prisma/client"` causes issues in a `"use client"`
   file. It shouldn't — `import type` is erased at compile time and never enters the bundle.
   Verified: Prisma types are already imported this way in `lib/validations/order.ts`.

3. What would you change, and why?
   One line change in `PatientForm.tsx`: replace the 7-line manual type block with a single
   `Pick<>` derivation. The type guard test becomes redundant after this (the compiler itself
   enforces the constraint) but can stay as documentation.
