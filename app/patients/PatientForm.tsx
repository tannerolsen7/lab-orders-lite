"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/shared/FormField";
import type { ActionResult } from "./actions";

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string | null;
  email: string | null;
};

export function PatientForm({
  patient,
  action,
  onSuccess,
}: {
  patient?: Patient;
  action: (formData: FormData) => Promise<ActionResult>;
  onSuccess: () => void;
}) {
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

  const defaultDob = patient
    ? patient.dateOfBirth.toISOString().split("T")[0]
    : "";

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="First name"
          name="firstName"
          required
          defaultValue={patient?.firstName}
        />
        <FormField
          label="Last name"
          name="lastName"
          required
          defaultValue={patient?.lastName}
        />
      </div>

      <FormField
        label="Date of birth"
        name="dateOfBirth"
        type="date"
        required
        defaultValue={defaultDob}
      />

      <FormField
        label="Phone"
        name="phone"
        type="tel"
        defaultValue={patient?.phone ?? ""}
      />

      <FormField
        label="Email"
        name="email"
        type="email"
        defaultValue={patient?.email ?? ""}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : patient
              ? "Save changes"
              : "Add patient"}
        </Button>
      </div>
    </form>
  );
}
