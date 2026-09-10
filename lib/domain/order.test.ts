import { describe, it, expect } from "vitest";
import {
  canTransition,
  getAvailableTransitions,
  computeTotalCents,
  computeEstimatedReadyDate,
} from "./order";

describe("canTransition", () => {
  it("allows PENDING → IN_PROGRESS", () => {
    expect(canTransition("PENDING", "IN_PROGRESS")).toBe(true);
  });

  it("allows PENDING → CANCELLED", () => {
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
  });

  it("allows IN_PROGRESS → COMPLETED", () => {
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("allows IN_PROGRESS → CANCELLED", () => {
    expect(canTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
  });

  it("disallows COMPLETED → any", () => {
    expect(canTransition("COMPLETED", "PENDING")).toBe(false);
    expect(canTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
  });

  it("disallows CANCELLED → any", () => {
    expect(canTransition("CANCELLED", "PENDING")).toBe(false);
    expect(canTransition("CANCELLED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("CANCELLED", "COMPLETED")).toBe(false);
  });

  it("disallows PENDING → COMPLETED (must go through IN_PROGRESS)", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
  });
});

describe("getAvailableTransitions", () => {
  it("returns IN_PROGRESS and CANCELLED for PENDING", () => {
    expect(getAvailableTransitions("PENDING")).toEqual([
      "IN_PROGRESS",
      "CANCELLED",
    ]);
  });

  it("returns COMPLETED and CANCELLED for IN_PROGRESS", () => {
    expect(getAvailableTransitions("IN_PROGRESS")).toEqual([
      "COMPLETED",
      "CANCELLED",
    ]);
  });

  it("returns empty for COMPLETED", () => {
    expect(getAvailableTransitions("COMPLETED")).toEqual([]);
  });

  it("returns empty for CANCELLED", () => {
    expect(getAvailableTransitions("CANCELLED")).toEqual([]);
  });
});

describe("computeTotalCents", () => {
  it("sums snapshotted prices", () => {
    expect(
      computeTotalCents([
        { priceCentsSnapshot: 3000 },
        { priceCentsSnapshot: 4500 },
      ])
    ).toBe(7500);
  });

  it("returns 0 for empty array", () => {
    expect(computeTotalCents([])).toBe(0);
  });

  it("handles a single item", () => {
    expect(computeTotalCents([{ priceCentsSnapshot: 2000 }])).toBe(2000);
  });
});

describe("computeEstimatedReadyDate", () => {
  it("adds the max turnaround hours to the order creation date", () => {
    const created = new Date("2026-09-01T10:00:00Z");
    const items = [
      { turnaroundHoursSnapshot: 24 },
      { turnaroundHoursSnapshot: 48 },
    ];
    const result = computeEstimatedReadyDate(created, items);
    expect(result).toEqual(new Date("2026-09-03T10:00:00Z"));
  });

  it("handles a single item", () => {
    const created = new Date("2026-09-01T10:00:00Z");
    const items = [{ turnaroundHoursSnapshot: 12 }];
    const result = computeEstimatedReadyDate(created, items);
    expect(result).toEqual(new Date("2026-09-01T22:00:00Z"));
  });
});
