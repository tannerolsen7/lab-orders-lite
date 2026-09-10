import type { ZodError } from "zod";
import type { ActionResult } from "@/lib/actionResult";

export function formatZodError(error: ZodError): ActionResult & { ok: false } {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  const firstField = Object.keys(fieldErrors)[0] as string | undefined;

  return {
    ok: false,
    error: firstField ? fieldErrors[firstField] : error.issues[0].message,
    ...(firstField ? { field: firstField } : {}),
    fieldErrors,
  };
}
