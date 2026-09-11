import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/shared/PageHeader";
import * as orderService from "@/lib/services/orders";
import { OrderList } from "./OrderList";

export default function OrdersPage() {
  return (
    <div>
      <PageHeader
        title="Orders"
        action={
          <Button asChild>
            <Link href="/orders/new">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Link>
          </Button>
        }
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-20 animate-pulse rounded-lg bg-muted"
                />
              ))}
              <div className="ml-auto h-10 w-56 animate-pulse rounded-lg bg-muted" />
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
        <OrderListLoader />
      </Suspense>
    </div>
  );
}

async function OrderListLoader() {
  const orders = await orderService.list();
  const rows = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    patient: { firstName: o.patient.firstName, lastName: o.patient.lastName },
    items: o.items.map((i) => ({
      priceCentsSnapshot: i.priceCentsSnapshot,
      turnaroundHoursSnapshot: i.turnaroundHoursSnapshot,
    })),
    createdBy: { name: o.createdBy.name },
  }));
  return <OrderList orders={rows} />;
}
