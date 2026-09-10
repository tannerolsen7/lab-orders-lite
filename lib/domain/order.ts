export type OrderStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function getAvailableTransitions(
  status: OrderStatus
): OrderStatus[] {
  return ORDER_TRANSITIONS[status];
}

export function computeTotalCents(
  items: { priceCentsSnapshot: number }[]
): number {
  return items.reduce((sum, item) => sum + item.priceCentsSnapshot, 0);
}

export function computeEstimatedReadyDate(
  orderCreatedAt: Date,
  items: { turnaroundHoursSnapshot: number }[]
): Date {
  if (items.length === 0) return new Date(orderCreatedAt);
  const maxHours = Math.max(
    ...items.map((item) => item.turnaroundHoursSnapshot)
  );
  const result = new Date(orderCreatedAt);
  result.setTime(result.getTime() + maxHours * 60 * 60 * 1000);
  return result;
}
