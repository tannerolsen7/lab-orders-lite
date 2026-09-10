"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
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
import { PatientForm } from "./PatientForm";
import { createPatient, updatePatient } from "./actions";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string | null;
  email: string | null;
};

const columns: Column<Patient>[] = [
  {
    header: "Name",
    cell: (row) => formatPatientName(row),
  },
  {
    header: "Date of Birth",
    cell: (row) => formatDate(row.dateOfBirth),
  },
  {
    header: "Phone",
    cell: (row) => row.phone ?? "—",
  },
  {
    header: "Email",
    cell: (row) => row.email ?? "—",
  },
];

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

      <Dialog open={action === "new"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Patient</DialogTitle>
            <DialogDescription>
              Register a new patient in the system.
            </DialogDescription>
          </DialogHeader>
          <PatientForm action={createPatient} onSuccess={closeDialog} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPatient} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>
              Update patient information.
            </DialogDescription>
          </DialogHeader>
          {editingPatient && (
            <PatientForm
              patient={editingPatient}
              action={(formData) =>
                updatePatient(editingPatient.id, formData)
              }
              onSuccess={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
