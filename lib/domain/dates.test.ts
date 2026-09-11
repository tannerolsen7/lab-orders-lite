import { describe, it, expect } from "vitest";
import { formatDate, isDateInPast, toUTCDate } from "./dates";

describe("formatDate", () => {
  it("formats a Date object to 'Mon DD, YYYY'", () => {
    const date = new Date("2024-01-15T00:00:00Z");
    expect(formatDate(date)).toBe("Jan 15, 2024");
  });

  it("formats an ISO date string", () => {
    expect(formatDate("2024-06-15T12:00:00.000Z")).toBe("Jun 15, 2024");
  });

  it("handles end-of-year dates", () => {
    const date = new Date("2024-12-31T00:00:00Z");
    expect(formatDate(date)).toBe("Dec 31, 2024");
  });

});

describe("isDateInPast", () => {
  it("returns true for a date in the past", () => {
    expect(isDateInPast("2000-01-01")).toBe(true);
  });

  it("returns false for a date in the future", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    expect(isDateInPast(futureDate.toISOString().split("T")[0])).toBe(false);
  });

  it("returns true for today", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(isDateInPast(today)).toBe(true);
  });
});

describe("toUTCDate", () => {
  it("parses a date string as midnight UTC", () => {
    const date = toUTCDate("2000-06-15");
    expect(date.toISOString()).toBe("2000-06-15T00:00:00.000Z");
  });
});
