import { describe, it, expect } from "vitest";
import { formatPatientName } from "./patient";

describe("formatPatientName", () => {
  it("formats as Last, First", () => {
    expect(
      formatPatientName({ firstName: "Maria", lastName: "Garcia" })
    ).toBe("Garcia, Maria");
  });
});
