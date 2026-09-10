import { z } from "zod";
import { OrderStatus } from "@prisma/client";

export const createOrderSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  labTestIds: z.array(z.string()).min(1, "At least one test is required"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateStatusSchema = z
  .object({
    status: z.nativeEnum(OrderStatus),
    cancelReason: z
      .string()
      .trim()
      .min(1, "Cancel reason is required")
      .optional(),
  })
  .refine((data) => data.status !== "CANCELLED" || data.cancelReason, {
    message: "Cancel reason is required when cancelling",
    path: ["cancelReason"],
  });

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
