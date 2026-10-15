import { beforeEach, afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn(), upload: vi.fn(), remove: vi.fn(), upsert: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/adminAuth", () => ({ requireAdminUser: m.auth, adminErrorResponse: () => Response.json({ ok: false }, { status: 500 }) }));
vi.mock("@/lib/supabaseAdmin", () => ({ createSupabaseAdmin: () => ({ from: m.from, storage: { from: () => ({ upload: m.upload, remove: m.remove }) } }) }));
import { POST } from "@/app/api/admin/cv/route";
function request(origin = "https://portfolio.test") {
  const form = new FormData(); form.set("file", new File(["%PDF-1.7\n%%EOF"], "CV.pdf", { type: "application/pdf" }));
  return new Request("https://portfolio.test/api/admin/cv", { method: "POST", headers: { origin }, body: form });
}
beforeEach(() => {
  vi.resetAllMocks(); m.auth.mockResolvedValue({ id: "admin" }); m.upload.mockResolvedValue({ error: null });
  const builder = { upsert: m.upsert, select: () => builder, single: m.single }; m.from.mockReturnValue(builder); m.upsert.mockReturnValue(builder);
  m.single.mockResolvedValue({ data: { storage_path: "versions/saved.pdf", file_name: "CV.pdf", file_size: 14, updated_at: "2026-10-15T00:00:00Z" }, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
it("rejects a cross-origin PDF upload before authorization and storage", async () => {
  expect((await POST(request("https://other.test"))).status).toBe(403); expect(m.auth).not.toHaveBeenCalled(); expect(m.upload).not.toHaveBeenCalled();
});
it("reports success only after the CV metadata is confirmed", async () => {
  const response = await POST(request()); expect(response.status).toBe(200); expect((await response.json()).cv.managed).toBe(true);
  expect(m.upload.mock.invocationCallOrder[0]).toBeLessThan(m.upsert.mock.invocationCallOrder[0]); expect(m.remove).not.toHaveBeenCalled();
});
it.each([{ data: null, error: { code: "", message: "fetch failed" } }, { data: null, error: null }])("keeps the PDF when activation was not confirmed", async (result) => {
  m.single.mockResolvedValue(result); const response = await POST(request()); expect(response.status).toBe(500); expect((await response.json()).ok).toBe(false); expect(m.remove).not.toHaveBeenCalled();
});
it("keeps the PDF when the activation response throws after a possible commit", async () => {
  m.single.mockRejectedValue(new Error("connection lost")); expect((await POST(request())).status).toBe(500); expect(m.remove).not.toHaveBeenCalled();
});
