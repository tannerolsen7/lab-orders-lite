"use server";

import { revalidatePath } from "next/cache";
import { patientSchema } from "@/lib/validations/patient";
import * as patientService from "@/lib/services/patients";
import { getCurrentUser } from "@/lib/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createPatient(formData: FormData): Promise<ActionResult> {
  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  };

  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { ok: false, error: firstError.message };
  }

  try {
    const user = await getCurrentUser();
    await patientService.create(parsed.data, user.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create patient" };
  }

  revalidatePath("/patients");
  return { ok: true };
}

export async function updatePatient(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  };

  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { ok: false, error: firstError.message };
  }

  try {
    const user = await getCurrentUser();
    await patientService.update(id, parsed.data, user.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update patient" };
  }

  revalidatePath("/patients");
  return { ok: true };
}
