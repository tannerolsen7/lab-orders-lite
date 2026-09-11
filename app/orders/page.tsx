import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/shared/PageHeader";
import * as orderService from "@/lib/services/orders";
import { OrderList } from "./OrderList";
import type { OrderStatus } from "@prisma/client";

const VALID_STATUSES = new Set<string>([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter = status && VALID_STATUSES.has(status)
    ? (status as OrderStatus)
    : undefined;

  const orders = await orderService.list(
    statusFilter ? { status: statusFilter } : undefined
  );
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
      <OrderList orders={rows} initialStatus={statusFilter ?? null} />
    </div>
  );
}
