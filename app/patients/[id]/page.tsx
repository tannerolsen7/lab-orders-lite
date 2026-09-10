import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatPatientName } from "@/lib/domain/patient";
import { formatDate } from "@/lib/domain/dates";
import * as patientService from "@/lib/services/patients";
import { PatientDetailEdit } from "./PatientDetailEdit";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let patient;
  try {
    patient = await patientService.getById(id);
  } catch {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={formatPatientName(patient)}
        action={<PatientDetailEdit patient={patient} />}
      />

      <div className="mb-6">
        <Link
          href="/patients"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to patients
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Full name</p>
              <p className="truncate">{formatPatientName(patient)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of birth</p>
              <p>{formatDate(patient.dateOfBirth)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="truncate">{patient.phone ?? "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="truncate">{patient.email ?? "Not provided"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
