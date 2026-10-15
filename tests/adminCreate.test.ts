import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminRecord } from "@/lib/adminCreate";

const id = "11111111-1111-4111-8111-111111111111";
const values = { id, title: "Service web", bullet_points: ["React", "Tests"], published: true };
const row = { ...values, created_at: "2026-10-15T00:00:00Z" };
const insert = vi.fn(), select = vi.fn(), eq = vi.fn(), abortSignal = vi.fn(), maybeSingle = vi.fn();
const builder = { insert, select, eq, abortSignal, maybeSingle };
const from = vi.fn(() => builder);
const client = { from } as unknown as SupabaseClient;
beforeEach(() => { vi.resetAllMocks(); from.mockReturnValue(builder); for (const fn of [insert, select, eq, abortSignal]) fn.mockReturnValue(builder); });
describe("creation retry with a stable UUID", () => {
  it("confirms a new record and uses the same deadline for database work", async () => {
    maybeSingle.mockResolvedValue({ data: row, error: null });
    const signal = AbortSignal.timeout(1000);
    expect((await createAdminRecord(client, "portfolio_services", values, "id,title,bullet_points,published", signal)).data).toEqual(row);
    expect(insert).toHaveBeenCalledWith(values); expect(from).toHaveBeenCalledTimes(1); expect(abortSignal).toHaveBeenCalledWith(signal);
  });
  it("acknowledges an identical saved entry after a lost creation response without updating it", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "23505" } }).mockResolvedValueOnce({ data: row, error: null });
    const result = await createAdminRecord(client, "portfolio_services", values, "*");
    expect(result.error).toBeNull(); expect(result.data).toEqual(row); expect(eq).toHaveBeenCalledWith("id", id); expect(insert).toHaveBeenCalledTimes(1);
  });
  it("rejects a UUID already used by a different draft", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "23505" } }).mockResolvedValueOnce({ data: { ...row, title: "Autre entrée" }, error: null });
    const result = await createAdminRecord(client, "portfolio_services", values, "*");
    expect(result.error?.code).toBe("ADMIN_CREATE_CONFLICT"); expect(result.data).toBeNull();
  });
  it("does not mistake another unique constraint for a confirmed retry", async () => {
    const error = { code: "23505", message: "slug already exists" };
    maybeSingle.mockResolvedValueOnce({ data: null, error }).mockResolvedValueOnce({ data: null, error: null });
    expect((await createAdminRecord(client, "portfolio_services", values, "*")).error).toEqual(error);
  });
  it("keeps an uncertain network failure as a failure without an automatic second write", async () => {
    const error = { code: "", message: "Failed to fetch" }; maybeSingle.mockResolvedValue({ data: null, error });
    expect((await createAdminRecord(client, "projects", { id, image_urls: ["https://storage.test/p.webp"] }, "*")).error).toEqual(error);
    expect(from).toHaveBeenCalledTimes(1); expect(insert).toHaveBeenCalledTimes(1);
  });
  it("does not confirm a retry when the lookup itself fails", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "23505" } }).mockResolvedValueOnce({ data: null, error: { code: "", message: "network unavailable" } });
    expect((await createAdminRecord(client, "portfolio_services", values, "*")).data).toBeNull();
  });
});
