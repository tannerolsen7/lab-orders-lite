import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import * as patientService from "@/lib/services/patients";
import { PatientList } from "./PatientList";

export default function PatientsPage() {
  return (
    <div>
      <PageHeader title="Patients" />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-10 flex-1 animate-pulse rounded-lg bg-muted" />
              <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          </div>
        }
      >
        <PatientListLoader />
      </Suspense>
    </div>
  );
}

async function PatientListLoader() {
  const patients = await patientService.list();
  return <PatientList patients={patients} />;
}
