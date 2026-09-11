export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; field?: string; fieldErrors?: Record<string, string> };

export function toActionError(
  e: unknown,
  knownErrors: Set<string>,
  knownPrefixes: string[] = []
): string {
  if (e instanceof Error) {
    if (knownErrors.has(e.message)) return e.message;
    if (knownPrefixes.some((prefix) => e.message.startsWith(prefix)))
      return e.message;
  }
  return "An unexpected error occurred. Please try again.";
}
