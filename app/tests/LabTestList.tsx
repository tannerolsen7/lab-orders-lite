"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, RotateCcw, Archive } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { centsToDollars } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { LabTestForm, type LabTest } from "./LabTestForm";
import {
  createLabTest,
  updateLabTest,
  retireLabTest,
  reactivateLabTest,
} from "./actions";

function StatusBadge({ active }: { active: boolean }) {
  if (active) return null;
  return <Badge variant="cancelled">Retired</Badge>;
}

function ActionButtons({
  labTest,
  onEdit,
  onRetire,
  onReactivate,
}: {
  labTest: LabTest;
  onEdit: (id: string) => void;
  onRetire: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(labTest.id);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      {labTest.active ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRetire(labTest.id);
          }}
        >
          <Archive className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onReactivate(labTest.id);
          }}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function LabTestList({ labTests }: { labTests: LabTest[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [, startTransition] = useTransition();

  const action = searchParams.get("action");
  const editId = searchParams.get("edit");
  const editingLabTest = editId
    ? labTests.find((t) => t.id === editId)
    : undefined;

  function handleEdit(id: string) {
    router.push(`/tests?edit=${id}`);
  }

  function handleRetire(id: string) {
    startTransition(async () => {
      const result = await retireLabTest(id);
      if (!result.ok) window.alert(result.error);
    });
  }

  function handleReactivate(id: string) {
    startTransition(async () => {
      const result = await reactivateLabTest(id);
      if (!result.ok) window.alert(result.error);
    });
  }

  const query = search.toLowerCase();
  const filtered = labTests.filter((t) => {
    if (!showInactive && !t.active) return false;
    return (
      t.code.toLowerCase().includes(query) ||
      t.name.toLowerCase().includes(query)
    );
  });

  const columns: Column<LabTest>[] = [
    {
      header: "Code",
      cell: (row) => (
        <span className="block max-w-24 truncate font-mono text-sm">
          {row.code}
        </span>
      ),
    },
    {
      header: "Name",
      cell: (row) => (
        <span className={cn("block max-w-48 truncate", !row.active && "text-muted-foreground")}>
          {row.name}
        </span>
      ),
    },
    {
      header: "Price",
      cell: (row) => (
        <span className={cn(!row.active && "text-muted-foreground")}>
          ${centsToDollars(row.priceCents)}
        </span>
      ),
    },
    {
      header: "Turnaround",
      cell: (row) => (
        <span className={cn(!row.active && "text-muted-foreground")}>
          {row.turnaroundHours}h
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => <StatusBadge active={row.active} />,
    },
    {
      header: "",
      cell: (row) => (
        <ActionButtons
          labTest={row}
          onEdit={handleEdit}
          onRetire={handleRetire}
          onReactivate={handleReactivate}
        />
      ),
    },
  ];

  function closeDialog() {
    router.push("/tests");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <SearchInput
          placeholder="Search by code or name..."
          value={search}
          onChange={setSearch}
          className="flex-1"
        />
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show retired
        </label>
        <Button
          className="shrink-0"
          onClick={() => router.push("/tests?action=new")}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Test
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? "No lab tests found" : "No lab tests yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first lab test to get started."
          }
          action={
            !search ? (
              <Button onClick={() => router.push("/tests?action=new")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Lab Test
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      <Dialog
        open={action === "new" || !!editingLabTest}
        onOpenChange={() => closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLabTest ? "Edit Lab Test" : "New Lab Test"}
            </DialogTitle>
            <DialogDescription>
              {editingLabTest
                ? "Update lab test details. The code cannot be changed."
                : "Add a new test to the lab catalog."}
            </DialogDescription>
          </DialogHeader>
          <LabTestForm
            labTest={editingLabTest}
            action={
              editingLabTest
                ? (formData) => updateLabTest(editingLabTest.id, formData)
                : createLabTest
            }
            onSuccess={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
