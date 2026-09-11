"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatPatientName } from "@/lib/domain/patient";
import { formatDate } from "@/lib/domain/dates";
import { PatientForm, type Patient } from "./PatientForm";
import { createPatient, updatePatient } from "./actions";

const columns: Column<Patient>[] = [
  {
    header: "Name",
    cell: (row) => (
      <span className="block max-w-48 truncate">{formatPatientName(row)}</span>
    ),
  },
  {
    header: "Date of Birth",
    cell: (row) => formatDate(row.dateOfBirth),
  },
  {
    header: "Phone",
    cell: (row) => (
      <span className="block max-w-36 truncate">{row.phone ?? "—"}</span>
    ),
  },
  {
    header: "Email",
    cell: (row) => (
      <span className="block max-w-48 truncate">{row.email ?? "—"}</span>
    ),
  },
  {
    header: "",
    cell: (row) => <EditButton patientId={row.id} />,
  },
];

function EditButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/patients?edit=${patientId}`);
      }}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  );
}

export function PatientList({ patients }: { patients: Patient[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");

  const action = searchParams.get("action");
  const editId = searchParams.get("edit");
  const editingPatient = editId
    ? patients.find((p) => p.id === editId)
    : undefined;

  const filtered = patients.filter((p) => {
    const query = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(query) ||
      p.lastName.toLowerCase().includes(query)
    );
  });

  function closeDialog() {
    router.push("/patients");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <SearchInput
          placeholder="Search by name..."
          value={search}
          onChange={setSearch}
          className="flex-1"
        />
        <Button onClick={() => router.push("/patients?action=new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Patient
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? "No patients found" : "No patients yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first patient to get started."
          }
          action={
            !search ? (
              <Button onClick={() => router.push("/patients?action=new")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Patient
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => router.push(`/patients/${row.id}`)}
        />
      )}

      <Dialog
        open={action === "new" || !!editingPatient}
        onOpenChange={() => closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPatient ? "Edit Patient" : "New Patient"}
            </DialogTitle>
            <DialogDescription>
              {editingPatient
                ? "Update patient information."
                : "Register a new patient in the system."}
            </DialogDescription>
          </DialogHeader>
          <PatientForm
            key={editingPatient?.id ?? "new"}
            patient={editingPatient}
            action={
              editingPatient
                ? (formData) => updatePatient(editingPatient.id, formData)
                : createPatient
            }
            onSuccess={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
