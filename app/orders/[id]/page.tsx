import { Suspense } from "react";
import { notFound } from "next/navigation";
import * as orderService from "@/lib/services/orders";
import { OrderDetail } from "./OrderDetail";
import OrderDetailLoading from "./loading";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<OrderDetailLoading />}>
      <OrderDetailLoader id={id} />
    </Suspense>
  );
}

async function OrderDetailLoader({ id }: { id: string }) {
  let order;
  try {
    order = await orderService.getById(id);
  } catch {
    notFound();
  }

  return <OrderDetail order={order} />;
}
