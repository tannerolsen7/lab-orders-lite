import { notFound } from "next/navigation";
import * as orderService from "@/lib/services/orders";
import { OrderDetail } from "./OrderDetail";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order;
  try {
    order = await orderService.getById(id);
  } catch {
    notFound();
  }

  return <OrderDetail order={order} />;
}
