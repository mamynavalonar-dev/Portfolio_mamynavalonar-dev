import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), from: vi.fn(), select: vi.fn(), order: vi.fn(), limit: vi.fn(), signal: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), eq: vi.fn(), single: vi.fn(), tag: vi.fn(), path: vi.fn(), result: { data: null as unknown, error: null as unknown } }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: (callback: () => void) => callback() }));
vi.mock("next/cache", () => ({ revalidateTag: m.tag, revalidatePath: m.path }));
vi.mock("@/lib/adminAuth", () => ({ requireAdminUser: m.auth, adminErrorResponse: (error: { status?: number }) => Response.json({ ok: false }, { status: error.status ?? 500 }) }));
vi.mock("@/lib/supabaseAdmin", () => ({ createSupabaseAdmin: m.client }));
import { createAdminContentHandlers } from "@/lib/adminPortfolioContent";
const id = "11111111-1111-4111-8111-111111111111";
const service = { title: "Service web", summary: "Résumé du service", description: "Description détaillée", bullet_points: ["Interfaces accessibles"], icon: "code", accent: "blue", display_order: 1, published: false };
const journey = { kind: "experience", title: "Développeur web", organization: "Mon entreprise", description: "", start_date: "2025-01", end_date: null, current: true, tags: ["React"], logo_url: null, project_id: null, external_url: null, display_order: 0, published: true };
const social = { platform: "github", title: "GitHub", display_name: "@profil", url: "https://github.com/profil", featured: false, published: true, display_order: 0 };
const request = (kind: string, method = "GET", data?: unknown, origin = "https://portfolio.test") => new Request(`https://portfolio.test/api/admin/${kind}`, { method, headers: { origin, "Content-Type": "application/json" }, ...(method !== "GET" ? { body: typeof data === "string" ? data : JSON.stringify(data ?? {}) } : {}) });
beforeEach(() => {
  vi.resetAllMocks(); m.auth.mockResolvedValue({ id: "admin" }); m.result = { data: { id, ...service }, error: null };
  const builder = { select: m.select, order: m.order, limit: m.limit, abortSignal: m.signal, insert: m.insert, update: m.update, delete: m.remove, eq: m.eq, maybeSingle: m.single, then: (resolve: (value: unknown) => unknown) => Promise.resolve(m.result).then(resolve) };
  for (const fn of [m.select, m.order, m.limit, m.signal, m.insert, m.update, m.remove, m.eq]) fn.mockReturnValue(builder);
  m.single.mockImplementation(() => Promise.resolve(m.result)); m.from.mockReturnValue(builder); m.client.mockReturnValue({ from: m.from });
  vi.spyOn(console, "error").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
describe.each(["services", "journey", "social"] as const)("admin %s API", (kind) => {
  const handlers = createAdminContentHandlers(kind); const values = kind === "services" ? service : kind === "journey" ? journey : social;
  it("rejects anonymous and non-admin users before reading or writing content", async () => {
    for (const status of [401, 403]) { m.auth.mockRejectedValue({ status }); expect((await handlers.GET(request(kind))).status).toBe(status); expect((await handlers.POST(request(kind, "POST", values))).status).toBe(status); }
    expect(m.client).not.toHaveBeenCalled(); expect(m.tag).not.toHaveBeenCalled();
  });
  it("rejects a cross-origin mutation before authorization", async () => { expect((await handlers.POST(request(kind, "POST", values, "https://other.test"))).status).toBe(403); expect(m.auth).not.toHaveBeenCalled(); });
  it("accepts the public host when Next reconstructs a localhost URL", async () => { const req = new Request(`http://localhost:3000/api/admin/${kind}`, { method: "POST", headers: { origin: "https://portfolio.test", host: "portfolio.test" }, body: JSON.stringify(values) }); expect((await handlers.POST(req)).status).toBe(201); });
  it("reads drafts for admins with a bounded, uncached response", async () => { m.result.data = [{ id, ...values, published: false }]; const response = await handlers.GET(request(kind)); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); expect(m.limit).toHaveBeenCalledWith(250); expect(m.signal.mock.calls[0][0]).toBeInstanceOf(AbortSignal); expect(m.tag).not.toHaveBeenCalled(); });
  it("creates valid content and invalidates public cache only after confirmed persistence", async () => { const response = await handlers.POST(request(kind, "POST", values)); expect(response.status).toBe(201); expect(m.from).toHaveBeenCalledWith(kind === "services" ? "portfolio_services" : kind === "journey" ? "portfolio_journey" : "portfolio_social_links"); expect(m.insert).toHaveBeenCalledTimes(1); expect(m.single.mock.invocationCallOrder[0]).toBeLessThan(m.tag.mock.invocationCallOrder[0]); expect(m.tag).toHaveBeenCalledWith("public-portfolio", { expire: 0 }); expect(m.path).toHaveBeenCalledWith("/"); });
  it("updates only the validated target ID", async () => { expect((await handlers.PATCH(request(kind, "PATCH", { id, ...values }))).status).toBe(200); expect(m.eq).toHaveBeenCalledWith("id", id); expect(m.update).toHaveBeenCalledTimes(1); });
  it("keeps the UUID supplied by the open creation form", async () => {
    expect((await handlers.POST(request(kind, "POST", { id, ...values }))).status).toBe(201);
    expect(m.insert.mock.calls[0][0].id).toBe(id);
  });
  it("confirms an identical retry without creating another record or overwriting it", async () => {
    m.single.mockResolvedValueOnce({ data: null, error: { code: "23505" } }).mockResolvedValueOnce({ data: { id, ...values, ...(kind === "journey" ? { start_date: "2025-01-01" } : {}) }, error: null });
    expect((await handlers.POST(request(kind, "POST", { id, ...values }))).status).toBe(201);
    expect(m.insert).toHaveBeenCalledTimes(1); expect(m.update).not.toHaveBeenCalled(); expect(m.eq).toHaveBeenCalledWith("id", id);
  });
  it("refuses to overwrite another draft that already uses the UUID", async () => {
    m.single.mockResolvedValueOnce({ data: null, error: { code: "23505" } }).mockResolvedValueOnce({ data: { id, ...values, title: "Autre contenu" }, error: null });
    expect((await handlers.POST(request(kind, "POST", { id, ...values }))).status).toBe(409); expect(m.update).not.toHaveBeenCalled(); expect(m.tag).not.toHaveBeenCalled();
  });
  it("rejects an invalid creation UUID before writing", async () => {
    expect((await handlers.POST(request(kind, "POST", { id: "bad", ...values }))).status).toBe(400); expect(m.insert).not.toHaveBeenCalled();
  });
  it("does not diagnose a connectivity failure as a missing migration", async () => {
    m.result = { data: null, error: { message: "fetch failed" } };
    const response = await handlers.GET(request(kind)); expect(response.status).toBe(503); expect((await response.json()).message).not.toContain("migration");
  });
  it("deletes only a confirmed existing row", async () => { expect((await handlers.DELETE(request(kind, "DELETE", { id }))).status).toBe(200); expect(m.remove).toHaveBeenCalledTimes(1); expect(m.eq).toHaveBeenCalledWith("id", id); });
  it("keeps failed writes from invalidating the public page", async () => { m.result = { data: null, error: { code: "XX000" } }; expect((await handlers.POST(request(kind, "POST", values))).status).toBe(500); expect(m.tag).not.toHaveBeenCalled(); });
  it("does not report a missing target as success", async () => { m.result.data = null; expect((await handlers.DELETE(request(kind, "DELETE", { id }))).status).toBe(404); expect(m.tag).not.toHaveBeenCalled(); });
  it("rejects bad JSON and oversized bodies before business writes", async () => { expect((await handlers.POST(request(kind, "POST", "{"))).status).toBe(400); expect((await handlers.POST(request(kind, "POST", "x".repeat(20_001)))).status).toBe(413); expect(m.insert).not.toHaveBeenCalled(); });
  it("rejects invalid IDs and content without touching persistence", async () => { expect((await handlers.PATCH(request(kind, "PATCH", { id: "invalid", ...values }))).status).toBe(400); expect((await handlers.POST(request(kind, "POST", { ...values, display_order: -1 }))).status).toBe(400); expect(m.insert).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled(); });
  it("offers a migration hint on a failed admin read", async () => { m.result = { data: null, error: { code: "42P01" } }; const response = await handlers.GET(request(kind)); expect(response.status).toBe(503); expect((await response.json()).message).toContain("migration"); });
  it("still confirms a successful save if cache invalidation is temporarily unavailable", async () => { m.tag.mockImplementation(() => { throw new Error("unavailable"); }); const response = await handlers.POST(request(kind, "POST", values)); expect(response.status).toBe(201); expect((await response.json()).revalidated).toBe(false); });
});
it("returns a clear validation error when a linked project was removed", async () => { m.result = { data: null, error: { code: "23503" } }; const response = await createAdminContentHandlers("journey").POST(request("journey", "POST", journey)); expect(response.status).toBe(400); expect((await response.json()).message).toContain("projet lié"); });
