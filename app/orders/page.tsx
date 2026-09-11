import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/shared/PageHeader";
import * as orderService from "@/lib/services/orders";
import { OrderList } from "./OrderList";

export default async function OrdersPage() {
  const orders = await orderService.list();

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
      <Suspense>
        <OrderList orders={orders} />
      </Suspense>
    </div>
  );
}
