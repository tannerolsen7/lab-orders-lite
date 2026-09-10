"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/shared/FormField";
import { centsToDollars } from "@/lib/domain/money";
import type { ActionResult } from "@/lib/actionResult";

export type LabTest = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  turnaroundHours: number;
  active: boolean;
};

export function LabTestForm({
  labTest,
  action,
  onSuccess,
}: {
  labTest?: LabTest;
  action: (formData: FormData) => Promise<ActionResult>;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState(labTest?.code ?? "");
  const [name, setName] = useState(labTest?.name ?? "");
  const [priceDollars, setPriceDollars] = useState(
    labTest ? centsToDollars(labTest.priceCents) : ""
  );
  const [turnaroundHours, setTurnaroundHours] = useState(
    labTest ? String(labTest.turnaroundHours) : ""
  );

  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => {
      const result = await action(formData);
      if (result.ok) {
        onSuccess();
      }
      return result;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <FormField
        label="Code"
        name="code"
        required
        disabled={!!labTest}
        placeholder="e.g. CBC"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <FormField
        label="Name"
        name="name"
        required
        placeholder="e.g. Complete Blood Count"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Price ($)"
          name="priceDollars"
          required
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={priceDollars}
          onChange={(e) => setPriceDollars(e.target.value)}
        />
        <FormField
          label="Turnaround (hours)"
          name="turnaroundHours"
          required
          type="number"
          min={1}
          step={1}
          placeholder="24"
          value={turnaroundHours}
          onChange={(e) => setTurnaroundHours(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : labTest
              ? "Save changes"
              : "Add lab test"}
        </Button>
      </div>
    </form>
  );
}
