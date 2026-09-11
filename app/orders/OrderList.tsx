"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { centsToDollars } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import {
  computeTotalCents,
  computeEstimatedReadyDate,
  STATUS_BADGE_MAP,
  STATUS_LABELS,
  type OrderStatus,
} from "@/lib/domain/order";

type OrderRow = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  createdAt: Date;
  patient: { firstName: string; lastName: string };
  items: { priceCentsSnapshot: number; turnaroundHoursSnapshot: number }[];
  createdBy: { name: string };
};

const STATUS_FILTERS: { label: string; value: OrderStatus | null }[] = [
  { label: "All", value: null },
  { label: "Pending", value: "PENDING" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const columns: Column<OrderRow>[] = [
  {
    header: "Patient",
    cell: (row) => (
      <span className="block max-w-48 truncate font-medium">
        {row.patient.lastName}, {row.patient.firstName}
      </span>
    ),
  },
  {
    header: "Status",
    cell: (row) => (
      <Badge variant={STATUS_BADGE_MAP[row.status]}>
        {STATUS_LABELS[row.status]}
      </Badge>
    ),
  },
  {
    header: "Total",
    cell: (row) => `$${centsToDollars(computeTotalCents(row.items))}`,
  },
  {
    header: "Est. Ready",
    cell: (row) =>
      row.status === "CANCELLED"
        ? "—"
        : formatDate(computeEstimatedReadyDate(row.createdAt, row.items)),
  },
  {
    header: "Created",
    cell: (row) => formatDate(row.createdAt),
  },
  {
    header: "By",
    cell: (row) => (
      <span className="block max-w-24 truncate">{row.createdBy.name}</span>
    ),
  },
];

export function OrderList({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);

  const statusCounts = useMemo(() => {
    const counts = new Map<OrderStatus, number>();
    for (const order of orders) {
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
    }
    return counts;
  }, [orders]);

  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (search) {
      const query = search.toLowerCase();
      return (
        o.patient.firstName.toLowerCase().includes(query) ||
        o.patient.lastName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          const count =
            filter.value !== null
              ? statusCounts.get(filter.value) ?? 0
              : null;

          return (
            <button
              key={filter.label}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-accent"
                  : "border border-border bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {filter.label}
              {isActive && count !== null && (
                <span className="ml-1.5 opacity-70">{count}</span>
              )}
            </button>
          );
        })}
        <SearchInput
          placeholder="Patient name..."
          value={search}
          onChange={setSearch}
          className="ml-auto w-56"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search || statusFilter ? "No orders found" : "No orders yet"}
          description={
            search || statusFilter
              ? "Try a different search term or filter."
              : "Create your first lab order to start tracking test results."
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => router.push("/orders/new")}>
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filtered}
            onRowClick={(row) => router.push(`/orders/${row.id}`)}
            rowClassName={(row) =>
              row.status === "CANCELLED" ? "opacity-60" : undefined
            }
          />
          {statusFilter && (
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span>{" "}
              {STATUS_LABELS[statusFilter].toLowerCase()} order{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}
