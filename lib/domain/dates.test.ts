import { describe, it, expect } from "vitest";
import { formatDate } from "./dates";

describe("formatDate", () => {
  it("formats a Date object to 'Mon DD, YYYY'", () => {
    const date = new Date(2024, 0, 15);
    expect(formatDate(date)).toBe("Jan 15, 2024");
  });

  it("formats an ISO date string", () => {
    expect(formatDate("2024-06-01T00:00:00.000Z")).toMatch(
      /Jun \d{1,2}, 2024/
    );
  });

  it("handles end-of-year dates", () => {
    const date = new Date(2024, 11, 31);
    expect(formatDate(date)).toBe("Dec 31, 2024");
  });
});
