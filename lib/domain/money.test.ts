import { describe, it, expect } from "vitest";
import { dollarsToCents, centsToDollars } from "./money";

describe("dollarsToCents", () => {
  it("converts a whole dollar amount", () => {
    expect(dollarsToCents("30")).toBe(3000);
  });

  it("converts dollars and cents", () => {
    expect(dollarsToCents("45.50")).toBe(4550);
  });

  it("converts a single cent value", () => {
    expect(dollarsToCents("0.01")).toBe(1);
  });

  it("rounds sub-cent amounts to nearest cent", () => {
    expect(dollarsToCents("30.005")).toBe(3001);
    expect(dollarsToCents("30.004")).toBe(3000);
  });

  it("handles zero", () => {
    expect(dollarsToCents("0")).toBe(0);
    expect(dollarsToCents("0.00")).toBe(0);
  });
});

describe("centsToDollars", () => {
  it("formats whole dollar amounts", () => {
    expect(centsToDollars(3000)).toBe("30.00");
  });

  it("formats amounts with cents", () => {
    expect(centsToDollars(4550)).toBe("45.50");
  });

  it("formats single cent", () => {
    expect(centsToDollars(1)).toBe("0.01");
  });

  it("formats zero", () => {
    expect(centsToDollars(0)).toBe("0.00");
  });

  it("formats large amounts", () => {
    expect(centsToDollars(100000)).toBe("1,000.00");
  });
});
