import { beforeEach, afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), order: vi.fn(), limit: vi.fn(), signal: vi.fn(), single: vi.fn(), result: { data: null as unknown, error: null as unknown } }));
vi.mock("@/lib/adminAuth", () => ({ requireAdminUser: m.auth, adminErrorResponse: (error: { status?: number }) => Response.json({ ok: false }, { status: error.status ?? 500 }) }));
vi.mock("@/lib/supabaseAdmin", () => ({ createSupabaseAdmin: m.client }));
import { GET, PATCH } from "@/app/api/admin/contact-messages/route";
const request = (value: unknown, origin = "https://portfolio.test") => new Request("https://portfolio.test/api/admin/contact-messages", { method: "PATCH", headers: { origin }, body: typeof value === "string" ? value : JSON.stringify(value) });
beforeEach(() => {
  vi.resetAllMocks(); m.auth.mockResolvedValue({ id: "admin" }); m.result = { data: { id: 4, status: "read" }, error: null };
  const builder = { update: m.update, eq: m.eq, select: m.select, order: m.order, limit: m.limit, abortSignal: m.signal, maybeSingle: m.single, then: (resolve: (value: unknown) => unknown) => Promise.resolve(m.result).then(resolve) };
  for (const fn of [m.update, m.eq, m.select, m.order, m.limit, m.signal]) fn.mockReturnValue(builder);
  m.single.mockImplementation(() => Promise.resolve(m.result)); m.from.mockReturnValue(builder); m.client.mockReturnValue({ from: m.from });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
it.each([401, 403])("checks admin authorization before data access (%i)", async (status) => {
  m.auth.mockRejectedValue({ status }); expect((await GET(new Request("https://portfolio.test/api/admin/contact-messages"))).status).toBe(status);
  expect((await PATCH(request({ id: 4, status: "read" }))).status).toBe(status); expect(m.client).not.toHaveBeenCalled();
});
it("rejects a cross-origin mutation before authorization", async () => {
  expect((await PATCH(request({ id: 4, status: "read" }, "https://other.test"))).status).toBe(403); expect(m.auth).not.toHaveBeenCalled();
});
it.each([null, [], {}, { id: -1, status: "read" }, { id: 1.2, status: "read" }, { id: 4, status: "unknown" }])("rejects invalid update shapes", async (input) => {
  expect((await PATCH(request(input))).status).toBe(400); expect(m.update).not.toHaveBeenCalled();
});
it("bounds the actual request body and reports malformed JSON as a client error", async () => {
  expect((await PATCH(request("x".repeat(2001)))).status).toBe(413); expect((await PATCH(request("{"))).status).toBe(400); expect(m.update).not.toHaveBeenCalled();
});
it("confirms only the validated status and targeted message with an uncached response", async () => {
  const response = await PATCH(request({ id: 4, status: "read" })); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); expect(m.update).toHaveBeenCalledWith({ status: "read" }); expect(m.eq).toHaveBeenCalledWith("id", 4); expect(m.signal.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
});
it("distinguishes a missing record from an unavailable write", async () => {
  m.result.data = null; expect((await PATCH(request({ id: 4, status: "read" }))).status).toBe(404);
  m.result.error = { message: "network unavailable" }; expect((await PATCH(request({ id: 4, status: "read" }))).status).toBe(500);
});
it("rejects an unknown filter and bounds a valid filtered read", async () => {
  expect((await GET(new Request("https://portfolio.test/api/admin/contact-messages?status=other"))).status).toBe(400); expect(m.from).not.toHaveBeenCalled();
  expect((await GET(new Request("https://portfolio.test/api/admin/contact-messages?status=new"))).status).toBe(200); expect(m.eq).toHaveBeenCalledWith("status", "new"); expect(m.limit).toHaveBeenCalledWith(100);
});
