"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { labTestSchema } from "@/lib/validations/labTest";
import * as labTestService from "@/lib/services/labTests";
import { dollarsToCents } from "@/lib/domain/money";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/actionResult";

const BUSINESS_ERRORS = new Set([
  "Lab test not found",
  "A lab test with this code already exists.",
]);

function toActionError(e: unknown): ActionResult {
  if (e instanceof Error && BUSINESS_ERRORS.has(e.message)) {
    return { ok: false, error: e.message };
  }
  return { ok: false, error: "An unexpected error occurred. Please try again." };
}

function parseForm<T extends z.ZodTypeAny>(schema: T, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
  }
  return { ok: true as const, data: parsed.data as z.infer<T> };
}

const updateSchema = labTestSchema.omit({ code: true });

export async function createLabTest(formData: FormData): Promise<ActionResult> {
  const result = parseForm(labTestSchema, formData);
  if (!result.ok) return { ok: false, error: result.error };

  try {
    const user = await getCurrentUser();
    await labTestService.create(
      {
        code: result.data.code,
        name: result.data.name,
        priceCents: dollarsToCents(result.data.priceDollars),
        turnaroundHours: result.data.turnaroundHours,
      },
      user.id
    );
  } catch (e) {
    return toActionError(e);
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

  const result = parseForm(updateSchema, formData);
  if (!result.ok) return { ok: false, error: result.error };

  try {
    const user = await getCurrentUser();
    await labTestService.update(
      idResult.data,
      {
        name: result.data.name,
        priceCents: dollarsToCents(result.data.priceDollars),
        turnaroundHours: result.data.turnaroundHours,
      },
      user.id
    );
  } catch (e) {
    return toActionError(e);
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
    return toActionError(e);
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
    return toActionError(e);
  }

  revalidatePath("/tests");
  return { ok: true };
}
