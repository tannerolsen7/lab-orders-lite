"use client";

import { useEffect } from "react";
import type { ActionResult } from "@/lib/actionResult";

export function useFormError(result: ActionResult | null) {
  useEffect(() => {
    if (!result || result.ok) return;

    const fieldToFocus =
      result.field ??
      (result.fieldErrors ? Object.keys(result.fieldErrors)[0] : undefined);

    if (!fieldToFocus) return;

    const el = document.getElementById(fieldToFocus);
    if (el instanceof HTMLElement) {
      el.focus();
    }
  }, [result]);
}
