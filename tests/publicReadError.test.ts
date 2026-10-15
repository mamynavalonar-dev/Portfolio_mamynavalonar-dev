import { describe, expect, it } from "vitest";
import { describePublicReadError } from "@/lib/publicReadError";
describe("public database error details", () => {
  it.each([
    [{ message: "TimeoutError: signal timed out" }, "timeout", "TIMEOUT"],
    [{ message: "TypeError: fetch failed", details: "ENOTFOUND" }, "network", "NETWORK"],
    [{ code: "42501", message: "permission denied for table projects" }, "access", "42501"],
    [{ code: "PGRST301", message: "JWT expired" }, "access", "PGRST301"],
    [{ code: "42703", message: "column updated_at does not exist" }, "schema", "42703"],
    [{ code: "XX000", message: "backend error" }, "service", "XX000"],
  ])("identifies the provider failure without hiding its cause", (error, category, code) => { expect(describePublicReadError(error)).toMatchObject({ category, code }); });
  it("distinguishes a missing additive migration from unrelated failures", () => { expect(describePublicReadError({ code: "PGRST205" }).missingMigration).toBe(true); expect(describePublicReadError({ code: "42501" }).missingMigration).toBe(false); expect(describePublicReadError({ message: "TimeoutError" }).missingMigration).toBe(false); });
  it("removes configured keys, provider URLs and other token shapes from messages", () => {
    const key = "configured-public-key";
    const issue = describePublicReadError({ message: `${key} https://project.test/rest?apikey=${key} eyJabc.def.ghi sb_secret_example123` }, [key]);
    expect(issue.message).not.toContain(key); expect(issue.message).not.toContain("project.test"); expect(issue.message).not.toContain("eyJabc"); expect(issue.message).not.toContain("sb_secret");
  });
  it("bounds untrusted text and rejects invalid diagnostic codes", () => { const issue = describePublicReadError({ code: "unsafe-token/value", message: "x".repeat(10000) }); expect(issue.code).toBe("UNKNOWN"); expect(issue.message.length).toBeLessThanOrEqual(280); });
});
