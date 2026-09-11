import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/shared/PageHeader";
import * as orderService from "@/lib/services/orders";
import { OrderList } from "./OrderList";

export default async function OrdersPage() {
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
      <OrderList orders={rows} />
    </div>
  );
}
