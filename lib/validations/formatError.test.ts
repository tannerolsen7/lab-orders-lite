import { describe, it, expect } from "vitest";
import { z } from "zod";
import { formatZodError } from "./formatError";

const testSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  email: z.string().email("Invalid email"),
  age: z.number().positive("Must be positive"),
});

describe("formatZodError", () => {
  it("returns the first field error as the top-level error", () => {
    const result = testSchema.safeParse({ firstName: "", email: "bad", age: -1 });
    if (result.success) throw new Error("Expected failure");

    const actionResult = formatZodError(result.error);

    expect(actionResult.ok).toBe(false);
    expect(actionResult.error).toBe("First name is required");
  });

  it("sets field to the first errored field name", () => {
    const result = testSchema.safeParse({ firstName: "", email: "bad", age: -1 });
    if (result.success) throw new Error("Expected failure");

    const actionResult = formatZodError(result.error);

    expect(actionResult).toHaveProperty("field", "firstName");
  });

  it("includes all field errors in fieldErrors", () => {
    const result = testSchema.safeParse({ firstName: "", email: "bad", age: -1 });
    if (result.success) throw new Error("Expected failure");

    const actionResult = formatZodError(result.error);

    expect(actionResult).toHaveProperty("fieldErrors", {
      firstName: "First name is required",
      email: "Invalid email",
      age: "Must be positive",
    });
  });

  it("keeps only the first error per field", () => {
    const schema = z.object({
      name: z.string().min(3, "Too short").max(5, "Too long"),
    });
    const result = schema.safeParse({ name: "" });
    if (result.success) throw new Error("Expected failure");

    const actionResult = formatZodError(result.error);

    expect(actionResult).toHaveProperty("fieldErrors", { name: "Too short" });
  });

  it("handles a single field error", () => {
    const result = testSchema.safeParse({ firstName: "Jane", email: "bad", age: 25 });
    if (result.success) throw new Error("Expected failure");

    const actionResult = formatZodError(result.error);

    expect(actionResult).toEqual({
      ok: false,
      error: "Invalid email",
      field: "email",
      fieldErrors: { email: "Invalid email" },
    });
  });

  it("handles refine errors with a path", () => {
    const schema = z
      .object({ phone: z.string().optional(), email: z.string().optional() })
      .refine((d) => d.phone || d.email, {
        message: "Provide at least one",
        path: ["phone"],
      });
    const result = schema.safeParse({});
    if (result.success) throw new Error("Expected failure");

    const actionResult = formatZodError(result.error);

    expect(actionResult).toEqual({
      ok: false,
      error: "Provide at least one",
      field: "phone",
      fieldErrors: { phone: "Provide at least one" },
    });
  });

  it("uses the error message as fallback when path is empty", () => {
    const schema = z
      .object({ a: z.string(), b: z.string() })
      .refine(() => false, { message: "Form-level error" });
    const result = schema.safeParse({ a: "ok", b: "ok" });
    if (result.success) throw new Error("Expected failure");

    const actionResult = formatZodError(result.error);

    expect(actionResult).toEqual({
      ok: false,
      error: "Form-level error",
      fieldErrors: {},
    });
  });
});
