import { z } from "zod";

export const patientSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    dateOfBirth: z.string().date("Invalid date"),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9()+\-.\s]+$/, "Phone must contain only valid characters")
      .min(7, "Phone number is too short")
      .optional()
      .or(z.literal("")),
    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.phone || data.email, {
    message: "At least one contact method (phone or email) is required",
    path: ["phone"],
  });

export type PatientInput = z.infer<typeof patientSchema>;
