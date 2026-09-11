import { describe, it, expectTypeOf } from "vitest";
import type { Patient as PrismaPatient } from "@prisma/client";
import type { Patient as FormPatient } from "./PatientForm";

describe("PatientForm type guard", () => {
  it("FormPatient fields must stay in sync with Prisma Patient", () => {
    expectTypeOf<
      Pick<PrismaPatient, keyof FormPatient>
    >().toEqualTypeOf<FormPatient>();
  });
});
