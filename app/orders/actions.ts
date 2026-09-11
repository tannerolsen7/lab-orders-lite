"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createOrderSchema, updateStatusSchema } from "@/lib/validations/order";
import * as orderService from "@/lib/services/orders";
import { getCurrentUser } from "@/lib/auth";
import { type ActionResult, toActionError } from "@/lib/actionResult";

const BUSINESS_ERRORS = new Set([
  "Patient not found",
  "One or more tests not found or inactive",
  "Cancel reason is required when cancelling",
]);

const BUSINESS_PREFIXES = ["Cannot transition"];

export async function createOrder(formData: {
  patientId: string;
  labTestIds: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = createOrderSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  try {
    const user = await getCurrentUser();
    const order = await orderService.create({
      ...parsed.data,
      createdById: user.id,
    });
    return { ok: true, id: order.id };
  } catch (e) {
    return { ok: false, error: toActionError(e, BUSINESS_ERRORS, BUSINESS_PREFIXES) };
  }
}

const orderIdSchema = z.string().min(1, "Order ID is required");

export async function updateOrderStatus(
  orderId: string,
  formData: FormData
): Promise<ActionResult> {
  const idParsed = orderIdSchema.safeParse(orderId);
  if (!idParsed.success) {
    return { ok: false, error: idParsed.error.errors[0].message };
  }

  const raw = {
    status: formData.get("status"),
    cancelReason: formData.get("cancelReason") || undefined,
  };

  const parsed = updateStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  try {
    const user = await getCurrentUser();
    await orderService.updateStatus(
      orderId,
      parsed.data.status,
      user.id,
      parsed.data.cancelReason
    );
  } catch (e) {
    return { ok: false, error: toActionError(e, BUSINESS_ERRORS, BUSINESS_PREFIXES) };
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
}
