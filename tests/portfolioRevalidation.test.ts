import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), tag: vi.fn(), path: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: m.tag, revalidatePath: m.path }));
vi.mock("@/lib/adminAuth", () => ({ requireAdminUser: m.auth, adminErrorResponse: () => Response.json({ ok: false }, { status: 401 }) }));
import { POST } from "@/app/api/admin/revalidate/route";
beforeEach(() => { vi.resetAllMocks(); m.auth.mockResolvedValue({ id: "admin" }); });
const request = (origin = "https://portfolio.test") => new Request("https://portfolio.test/api/admin/revalidate", { method: "POST", headers: { origin } });
describe("portfolio cache invalidation", () => {
  it("rejects an unauthenticated user before touching cache", async () => {
    m.auth.mockRejectedValue(new Error("unauthenticated"));
    expect((await POST(request())).status).toBe(401);
    expect(m.tag).not.toHaveBeenCalled(); expect(m.path).not.toHaveBeenCalled();
  });
  it("rejects a cross-origin write before authorization or invalidation", async () => {
    expect((await POST(request("https://other.test"))).status).toBe(403);
    expect(m.auth).not.toHaveBeenCalled(); expect(m.tag).not.toHaveBeenCalled();
  });
  it("accepts the browser host when Next reconstructs an internal request URL", async () => {
    const proxied = new Request("http://localhost:3127/api/admin/revalidate", { method: "POST", headers: { host: "portfolio.test", origin: "https://portfolio.test" } });
    expect((await POST(proxied)).status).toBe(200);
    expect(m.auth).toHaveBeenCalledTimes(1);
  });
  it("rejects a malformed Origin before any side effect", async () => {
    expect((await POST(request("null"))).status).toBe(403);
    expect(m.auth).not.toHaveBeenCalled(); expect(m.tag).not.toHaveBeenCalled();
  });
  it("invalidates home, sitemap and details only after admin authorization", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(m.auth.mock.invocationCallOrder[0]).toBeLessThan(m.tag.mock.invocationCallOrder[0]);
    expect(m.tag).toHaveBeenCalledWith("public-portfolio", { expire: 0 });
    expect(m.path.mock.calls).toEqual([["/"], ["/sitemap.xml"], ["/portfolio/[id]", "page"]]);
  });
});
