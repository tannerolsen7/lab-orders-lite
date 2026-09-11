import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import * as patientService from "@/lib/services/patients";
import { PatientList } from "./PatientList";

async function PatientListLoader() {
  const patients = await patientService.list();
  return <PatientList patients={patients} />;
}

export default function PatientsPage() {
  return (
    <div>
      <PageHeader title="Patients" />
      <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Loading patients...</div>}>
        <PatientListLoader />
      </Suspense>
    </div>
  );
}
