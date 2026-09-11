import * as patientService from "@/lib/services/patients";
import * as labTestService from "@/lib/services/labTests";
import { OrderCreateForm } from "./OrderCreateForm";

export default async function NewOrderPage() {
  const [patients, labTests] = await Promise.all([
    patientService.list(),
    labTestService.list(),
  ]);

  return <OrderCreateForm patients={patients} labTests={labTests} />;
}
