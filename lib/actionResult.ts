export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; field?: string; fieldErrors?: Record<string, string> };
