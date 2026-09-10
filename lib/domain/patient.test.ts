import { describe, it, expect } from "vitest";
import { isDateInPast, toUTCDate, formatPatientName } from "./patient";

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

describe("formatPatientName", () => {
  it("formats as Last, First", () => {
    expect(
      formatPatientName({ firstName: "Maria", lastName: "Garcia" })
    ).toBe("Garcia, Maria");
  });
});
