import { describe, it, expect } from "vitest";
import { formatPatientName, formatPhone } from "./patient";

describe("formatPatientName", () => {
  it("formats as Last, First", () => {
    expect(
      formatPatientName({ firstName: "Maria", lastName: "Garcia" })
    ).toBe("Garcia, Maria");
  });

  it("handles single-character names", () => {
    expect(formatPatientName({ firstName: "J", lastName: "X" })).toBe("X, J");
  });

  it("handles long names", () => {
    const result = formatPatientName({
      firstName: "Alexander",
      lastName: "Wolfeschlegelsteinhausenberger",
    });
    expect(result).toBe("Wolfeschlegelsteinhausenberger, Alexander");
  });
});

describe("formatPhone", () => {
  it("formats 10-digit number as (XXX) XXX-XXXX", () => {
    expect(formatPhone("5551234567")).toBe("(555) 123-4567");
  });

  it("strips non-digit characters before formatting", () => {
    expect(formatPhone("555-123-4567")).toBe("(555) 123-4567");
  });

  it("handles already formatted input", () => {
    expect(formatPhone("(555) 234-5678")).toBe("(555) 234-5678");
  });

  it("returns the original string if not 10 digits", () => {
    expect(formatPhone("12345")).toBe("12345");
  });

  it("handles 11-digit number with leading 1", () => {
    expect(formatPhone("15551234567")).toBe("(555) 123-4567");
  });

  it("returns null/undefined as-is", () => {
    expect(formatPhone(null)).toBeNull();
    expect(formatPhone(undefined)).toBeUndefined();
  });
});
