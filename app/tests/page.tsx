import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import * as labTestService from "@/lib/services/labTests";
import { LabTestList } from "./LabTestList";

export default async function LabTestsPage() {
  const labTests = await labTestService.list(true);

  return (
    <div>
      <PageHeader title="Lab Tests" />
      <Suspense>
        <LabTestList labTests={labTests} />
      </Suspense>
    </div>
  );
}
