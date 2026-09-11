"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { Patient as PrismaPatient } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/shared/FormField";
import type { ActionResult } from "./actions";

export type Patient = Pick<
  PrismaPatient,
  "id" | "firstName" | "lastName" | "dateOfBirth" | "phone" | "email"
>;

export function PatientForm({
  patient,
  action,
  onSuccess,
}: {
  patient?: Patient;
  action: (formData: FormData) => Promise<ActionResult>;
  onSuccess: () => void;
}) {
  const [firstName, setFirstName] = useState(patient?.firstName ?? "");
  const [lastName, setLastName] = useState(patient?.lastName ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    patient ? patient.dateOfBirth.toISOString().split("T")[0] : ""
  );
  const [phone, setPhone] = useState(patient?.phone ?? "");
  const [email, setEmail] = useState(patient?.email ?? "");

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

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="First name"
          name="firstName"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <FormField
          label="Last name"
          name="lastName"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <FormField
        label="Date of birth"
        name="dateOfBirth"
        type="date"
        required
        value={dateOfBirth}
        onChange={(e) => setDateOfBirth(e.target.value)}
      />

      <FormField
        label="Phone"
        name="phone"
        type="tel"
        pattern="[0-9()+\-.\s]{7,}"
        title="Enter a valid phone number (at least 7 digits)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <FormField
        label="Email"
        name="email"
        type="email"
        pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
        title="Enter a valid email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
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
