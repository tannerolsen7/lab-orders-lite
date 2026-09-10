import { z } from "zod";

export const labTestSchema = z.object({
  code: z.string().trim().min(1, "Code is required").toUpperCase(),
  name: z.string().trim().min(1, "Name is required"),
  priceDollars: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price")
    .refine((val) => parseFloat(val) > 0, "Price must be greater than zero"),
  turnaroundHours: z.coerce
    .number()
    .int("Must be a whole number")
    .positive("Turnaround time must be a positive whole number"),
});

export type LabTestInput = z.infer<typeof labTestSchema>;
