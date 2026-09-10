"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { patientSchema } from "@/lib/validations/patient";
import * as patientService from "@/lib/services/patients";
import { getCurrentUser } from "@/lib/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

const BUSINESS_ERRORS = new Set(["Date of birth must be in the past"]);

function toActionError(e: unknown): string {
  if (e instanceof Error && BUSINESS_ERRORS.has(e.message)) {
    return e.message;
  }
  return "An unexpected error occurred. Please try again.";
}

function parsePatientForm(formData: FormData) {
  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  };

  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
  }
  return { ok: true as const, data: parsed.data };
}

export async function createPatient(formData: FormData): Promise<ActionResult> {
  const result = parsePatientForm(formData);
  if (!result.ok) return { ok: false, error: result.error };

  try {
    const user = await getCurrentUser();
    await patientService.create(result.data, user.id);
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }

  revalidatePath("/patients");
  return { ok: true };
}

const idSchema = z.string().min(1);

export async function updatePatient(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { ok: false, error: "Invalid patient ID." };

  const result = parsePatientForm(formData);
  if (!result.ok) return { ok: false, error: result.error };

  try {
    const user = await getCurrentUser();
    await patientService.update(idResult.data, result.data, user.id);
  } catch (e) {
    return { ok: false, error: toActionError(e) };
  }

  revalidatePath("/patients");
  return { ok: true };
}
