import { describe, it, expect } from "vitest";
import { formatDate } from "./dates";

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

  it("does not shift date-only values across timezone boundaries", () => {
    const date = new Date("2024-03-15T00:00:00Z");
    expect(formatDate(date)).toBe("Mar 15, 2024");
  });
});
