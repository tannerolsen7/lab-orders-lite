"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { centsToDollars } from "@/lib/domain/money";
import { computeTotalCents, computeEstimatedReadyDate } from "@/lib/domain/order";
import { formatDate } from "@/lib/domain/dates";
import { createOrder } from "../actions";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
};

type LabTest = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  turnaroundHours: number;
};

export function OrderCreateForm({
  patients,
  labTests,
}: {
  patients: Patient[];
  labTests: LabTest[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);

  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(
    new Set()
  );
  const [testSearch, setTestSearch] = useState("");
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!patientOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        patientDropdownRef.current &&
        !patientDropdownRef.current.contains(e.target as Node)
      ) {
        setPatientOpen(false);
        setPatientSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [patientOpen]);

  const selectedTests = useMemo(
    () => labTests.filter((t) => selectedTestIds.has(t.id)),
    [labTests, selectedTestIds]
  );

  const totalCents = useMemo(
    () =>
      computeTotalCents(
        selectedTests.map((t) => ({ priceCentsSnapshot: t.priceCents }))
      ),
    [selectedTests]
  );

  const estimatedReady =
    selectedTests.length > 0
      ? computeEstimatedReadyDate(
          new Date(),
          selectedTests.map((t) => ({
            turnaroundHoursSnapshot: t.turnaroundHours,
          }))
        )
      : null;

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch) return true;
    const q = patientSearch.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q)
    );
  });

  const filteredTests = labTests.filter((t) => {
    if (!testSearch) return true;
    const q = testSearch.toLowerCase();
    return (
      t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  });

  function toggleTest(id: string) {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createOrder({
        patientId: selectedPatientId,
        labTestIds: Array.from(selectedTestIds),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/orders/${result.id}`);
    });
  }

  const canSubmit = selectedPatientId && selectedTestIds.size > 0 && !isPending;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
        <Link
          href="/orders"
          className="text-teal hover:text-teal/80 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">New Order</h1>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-0 min-h-[480px]">
        {/* Form side */}
        <div className="flex-1 pr-6">
          {/* Patient picker */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold">
              Patient
            </label>
            <div className="relative" ref={patientDropdownRef}>
              <button
                type="button"
                onClick={() => setPatientOpen(!patientOpen)}
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors",
                  selectedPatient
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {selectedPatient ? (
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-[10px] font-semibold text-white">
                      {selectedPatient.firstName[0]}
                      {selectedPatient.lastName[0]}
                    </div>
                    <span className="font-medium">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </span>
                  </div>
                ) : (
                  "Select a patient..."
                )}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="shrink-0 text-muted-foreground"
                >
                  <path
                    d="M3 5l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {patientOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                  <div className="p-2">
                    <Input
                      placeholder="Search patients..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredPatients.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No patients found.
                      </div>
                    ) : (
                      filteredPatients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            setPatientOpen(false);
                            setPatientSearch("");
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors",
                            p.id === selectedPatientId && "bg-secondary"
                          )}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-[10px] font-semibold text-white">
                            {p.firstName[0]}
                            {p.lastName[0]}
                          </div>
                          <span className="font-medium">
                            {p.firstName} {p.lastName}
                          </span>
                          {p.id === selectedPatientId && (
                            <Check className="ml-auto h-4 w-4 text-teal" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test selection */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                className={cn(
                  "text-sm font-semibold",
                  !selectedPatientId && "opacity-40"
                )}
              >
                Select Tests
              </label>
              {selectedPatientId && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter tests..."
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    className="h-8 w-44 pl-8 text-xs"
                  />
                </div>
              )}
            </div>

            {!selectedPatientId ? (
              <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Select a patient first to choose tests.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl bg-card shadow-sm">
                {filteredTests.map((test) => {
                  const selected = selectedTestIds.has(test.id);
                  return (
                    <button
                      key={test.id}
                      type="button"
                      onClick={() => toggleTest(test.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-border/50 px-4 py-3.5 text-left transition-colors last:border-b-0",
                        selected ? "bg-emerald-50/50" : "hover:bg-secondary/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                          selected
                            ? "bg-teal"
                            : "border-[1.5px] border-muted-foreground/30"
                        )}
                      >
                        {selected && (
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="mr-2 font-mono text-[11px] font-semibold text-teal">
                          {test.code}
                        </span>
                        <span className="text-sm font-medium">{test.name}</span>
                      </div>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        ${centsToDollars(test.priceCents)}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {test.turnaroundHours} hrs
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sticky summary sidebar */}
        <div className="w-72 shrink-0 border-l border-border bg-card p-6 rounded-r-xl flex flex-col">
          <h2 className="mb-5 text-sm font-semibold">Order Summary</h2>

          {selectedTests.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              No tests selected yet.
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-3">
              {selectedTests.map((test) => (
                <div
                  key={test.id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-muted-foreground">{test.code}</span>
                  <span className="font-medium">
                    ${centsToDollars(test.priceCents)}
                  </span>
                </div>
              ))}
              <div className="my-1 h-px bg-border" />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>${centsToDollars(totalCents)}</span>
              </div>
              {estimatedReady && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Ready</span>
                  <span>{formatDate(estimatedReady)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tests</span>
                <span>{selectedTests.length} selected</span>
              </div>
            </div>
          )}

          <Button
            className="mt-6 w-full"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Order...
              </>
            ) : (
              "Submit Order"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
