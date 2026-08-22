import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeContactString } from "@/lib/contactValidation";

describe("contact validation", () => {
  it("accepts a normal email address", () => {
    expect(isValidEmail("mamy@example.com")).toBe(true);
  });

  it("rejects whitespace and incomplete domains", () => {
    expect(isValidEmail("mamy @example.com")).toBe(false);
    expect(isValidEmail("mamy@example")).toBe(false);
  });

  it("normalizes only strings", () => {
    expect(normalizeContactString("  Bonjour  ")).toBe("Bonjour");
    expect(normalizeContactString(null)).toBe("");
  });
});
