"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { labTestSchema, type LabTestInput } from "@/lib/validations/labTest";
import * as labTestService from "@/lib/services/labTests";
import { dollarsToCents } from "@/lib/domain/money";
import { getCurrentUser } from "@/lib/auth";
import { type ActionResult, toActionError } from "@/lib/actionResult";

const BUSINESS_ERRORS = new Set([
  "Lab test not found",
  "A lab test with this code already exists.",
]);

const updateSchema = labTestSchema.omit({ code: true });

export async function createLabTest(formData: FormData): Promise<ActionResult> {
  const parsed = labTestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const data: LabTestInput = parsed.data;

  try {
    const user = await getCurrentUser();
    await labTestService.create(
      {
        code: data.code,
        name: data.name,
        priceCents: dollarsToCents(data.priceDollars),
        turnaroundHours: data.turnaroundHours,
      },
      user.id
    );
  } catch (e) {
    return { ok: false, error: toActionError(e, BUSINESS_ERRORS) };
  }

  revalidatePath("/tests");
  return { ok: true };
}

const idSchema = z.string().min(1);

export async function updateLabTest(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { ok: false, error: "Invalid lab test ID." };

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  try {
    const user = await getCurrentUser();
    await labTestService.update(
      idResult.data,
      {
        name: parsed.data.name,
        priceCents: dollarsToCents(parsed.data.priceDollars),
        turnaroundHours: parsed.data.turnaroundHours,
      },
      user.id
    );
  } catch (e) {
    return { ok: false, error: toActionError(e, BUSINESS_ERRORS) };
  }

  revalidatePath("/tests");
  return { ok: true };
}

export async function retireLabTest(id: string): Promise<ActionResult> {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { ok: false, error: "Invalid lab test ID." };

  try {
    const user = await getCurrentUser();
    await labTestService.retire(idResult.data, user.id);
  } catch (e) {
    return { ok: false, error: toActionError(e, BUSINESS_ERRORS) };
  }

  revalidatePath("/tests");
  return { ok: true };
}

export async function reactivateLabTest(id: string): Promise<ActionResult> {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { ok: false, error: "Invalid lab test ID." };

  try {
    const user = await getCurrentUser();
    await labTestService.reactivate(idResult.data, user.id);
  } catch (e) {
    return { ok: false, error: toActionError(e, BUSINESS_ERRORS) };
  }

  revalidatePath("/tests");
  return { ok: true };
}
