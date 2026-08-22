import { describe, expect, it } from "vitest";
import { listToInput, toStringList } from "@/lib/projectFields";

describe("project list fields", () => {
  it("keeps PostgreSQL arrays canonical", () => {
    expect(toStringList(["React", " TypeScript ", ""])).toEqual([
      "React",
      "TypeScript",
    ]);
  });

  it("migrates legacy comma and newline strings", () => {
    expect(toStringList("Next.js, Supabase\nPostgreSQL")).toEqual([
      "Next.js",
      "Supabase",
      "PostgreSQL",
    ]);
  });

  it("serializes arrays for admin form inputs", () => {
    expect(listToInput(["React", "Next.js"])).toBe("React, Next.js");
  });
});
