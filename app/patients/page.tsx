import { PageHeader } from "@/components/shared/PageHeader";
import * as patientService from "@/lib/services/patients";
import { PatientList } from "./PatientList";

export default async function PatientsPage() {
  const patients = await patientService.list();

  return (
    <div>
      <PageHeader title="Patients" />
      <PatientList patients={patients} />
    </div>
  );
}
