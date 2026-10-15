import { expect, it } from "vitest";
import { adminReadErrorMessage } from "@/lib/adminReadError";
it("distinguishes missing migrations, denied access and transient connectivity", () => {
  expect(adminReadErrorMessage({ code: "42P01" })).toContain("migration");
  expect(adminReadErrorMessage({ code: "PGRST205" })).toContain("migration");
  expect(adminReadErrorMessage({ code: "42501" })).toContain("autorisation");
  expect(adminReadErrorMessage({ message: "fetch failed" })).toContain("connexion");
  expect(adminReadErrorMessage({ name: "TimeoutError" })).toContain("temps");
  for (const error of [{ message: "fetch failed" }, { name: "TimeoutError" }, { code: "42501" }]) expect(adminReadErrorMessage(error)).not.toContain("migration");
});
