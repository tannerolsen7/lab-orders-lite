"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { cn } from "@/lib/utils";
import { centsToDollars } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import {
  computeTotalCents,
  computeEstimatedReadyDate,
  getAvailableTransitions,
  STATUS_BADGE_MAP,
  STATUS_LABELS,
  type OrderStatus,
} from "@/lib/domain/order";
import { updateOrderStatus } from "../actions";

type OrderWithRelations = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: { id: string; firstName: string; lastName: string };
  items: {
    id: string;
    priceCentsSnapshot: number;
    turnaroundHoursSnapshot: number;
    labTest: { code: string; name: string };
  }[];
  createdBy: { name: string };
  updatedBy: { name: string } | null;
};

const TRANSITION_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "Start Processing",
  COMPLETED: "Mark Completed",
  CANCELLED: "Cancel Order",
};

export function OrderDetail({ order }: { order: OrderWithRelations }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totalCents = computeTotalCents(order.items);
  const estimatedReady = computeEstimatedReadyDate(
    order.createdAt,
    order.items
  );
  const availableTransitions = getAvailableTransitions(order.status);

  function handleTransition(status: OrderStatus) {
    if (status === "CANCELLED") {
      setCancelOpen(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("status", status);
      const result = await updateOrderStatus(order.id, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("status", "CANCELLED");
      formData.set("cancelReason", cancelReason);
      const result = await updateOrderStatus(order.id, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCancelOpen(false);
      router.refresh();
    });
  }

  const isCancelled = order.status === "CANCELLED";
  const isCompleted = order.status === "COMPLETED";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/orders" className="text-teal hover:text-teal/80 transition-colors">
          Orders
        </Link>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="text-border"
        >
          <path
            d="M4.5 2l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-medium text-foreground">
          Order #{order.orderNumber}
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Header card */}
      <div className="mb-6 rounded-2xl bg-card p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">
                Order #{order.orderNumber}
              </h1>
              <Badge variant={STATUS_BADGE_MAP[order.status]}>
                {STATUS_LABELS[order.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Patient:{" "}
              <Link
                href={`/patients/${order.patient.id}`}
                className="font-medium text-teal hover:text-teal/80 transition-colors"
              >
                {order.patient.firstName} {order.patient.lastName}
              </Link>
            </p>
          </div>

          {availableTransitions.length > 0 && (
            <div className="flex shrink-0 gap-2">
              {availableTransitions.map((status) =>
                status === "CANCELLED" ? (
                  <Button
                    key={status}
                    variant="outline"
                    size="sm"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleTransition(status)}
                    disabled={isPending}
                  >
                    {TRANSITION_LABELS[status]}
                  </Button>
                ) : (
                  <Button
                    key={status}
                    size="sm"
                    onClick={() => handleTransition(status)}
                    disabled={isPending}
                  >
                    {TRANSITION_LABELS[status]}
                  </Button>
                )
              )}
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </p>
            <p
              className={cn(
                "text-lg font-semibold",
                isCancelled && "text-muted-foreground"
              )}
            >
              ${centsToDollars(totalCents)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isCompleted ? "Completed" : isCancelled ? "Cancelled" : "Est. Ready"}
            </p>
            <p
              className={cn(
                "text-sm",
                isCompleted && "font-medium text-emerald-700",
                isCancelled && "text-muted-foreground"
              )}
            >
              {isCompleted || isCancelled
                ? formatDate(order.updatedAt)
                : formatDate(estimatedReady)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Created
            </p>
            <p
              className={cn(
                "text-sm",
                isCancelled && "text-muted-foreground"
              )}
            >
              {formatDate(order.createdAt)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Created By
            </p>
            <p
              className={cn(
                "text-sm",
                isCancelled && "text-muted-foreground"
              )}
            >
              {order.createdBy.name}
            </p>
          </div>
        </div>
      </div>

      {/* Completed banner */}
      {isCompleted && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dcff9f]">
            <Check className="h-4 w-4 text-emerald-800" strokeWidth={2.5} />
          </div>
          <p className="text-sm font-medium text-emerald-800">
            Order completed on {formatDate(order.updatedAt)}. All tests
            processed.
          </p>
        </div>
      )}

      {/* Cancellation reason */}
      {isCancelled && order.cancelReason && (
        <div className="mb-6 rounded-xl bg-card p-5 shadow-sm">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cancellation Reason
          </p>
          <p className="text-sm leading-relaxed">{order.cancelReason}</p>
        </div>
      )}

      {/* Line items */}
      <h2 className="mb-3 text-base font-semibold">Line Items</h2>
      <div
        className={cn(
          "overflow-hidden rounded-xl bg-card shadow-sm",
          isCancelled && "opacity-60"
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Turnaround</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs font-semibold text-teal">
                  <span className="block max-w-24 truncate">{item.labTest.code}</span>
                </TableCell>
                <TableCell className="font-medium">
                  <span className="block max-w-48 truncate">{item.labTest.name}</span>
                </TableCell>
                <TableCell>
                  ${centsToDollars(item.priceCentsSnapshot)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.turnaroundHoursSnapshot} hours
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cancel dialog */}
      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) setCancelReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order #{order.orderNumber}?</DialogTitle>
            <DialogDescription>
              This cannot be undone. The order will be permanently marked as
              cancelled.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Reason for cancellation{" "}
              <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Why is this order being cancelled?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelOpen(false);
                setCancelReason("");
              }}
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || isPending}
              onClick={handleCancel}
            >
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
