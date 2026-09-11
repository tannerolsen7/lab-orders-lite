import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatPatientName, formatPhone } from "@/lib/domain/patient";
import { formatDate } from "@/lib/domain/dates";
import { centsToDollars } from "@/lib/domain/money";
import { computeTotalCents, STATUS_LABELS, STATUS_BADGE_MAP } from "@/lib/domain/order";
import * as patientService from "@/lib/services/patients";
import * as orderService from "@/lib/services/orders";
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

  const orders = await orderService.listByPatient(id);

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
              <p className="truncate">{formatPhone(patient.phone) ?? "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="truncate">{patient.email ?? "Not provided"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No orders yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Order #</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Tests</th>
                    <th className="pb-2 pr-4 font-medium">Total</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-primary hover:underline"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-2 pr-4">
                        {order.items.length}
                      </td>
                      <td className="py-2 pr-4">
                        ${centsToDollars(computeTotalCents(order.items))}
                      </td>
                      <td className="py-2">
                        <Badge variant={STATUS_BADGE_MAP[order.status]}>
                          {STATUS_LABELS[order.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
