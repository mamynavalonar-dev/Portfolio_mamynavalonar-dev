import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), order: vi.fn(), limit: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseAdmin", () => ({ createSupabaseAdmin: () => db }));
import { GET } from "@/app/api/comments/route";

beforeEach(() => {
  vi.clearAllMocks();
  db.from.mockReturnValue(db);
  db.select.mockReturnValue(db);
  db.order.mockReturnValue(db);
  db.limit.mockResolvedValue({ data: [{ id: 2, name: "Visiteur", comment: "Merci", likes: 1 }], error: null });
  vi.stubEnv("COMMENT_VISITOR_SECRET", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("public comment reads", () => {
  it("reads public fields in the existing order without creating a vote cookie", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, comments: [{ id: 2, name: "Visiteur", comment: "Merci", likes: 1 }] });
    expect(db.from).toHaveBeenCalledWith("comments");
    expect(db.select).toHaveBeenCalledWith("id,name,comment,image_url,likes,is_pinned,replies,created_at,liked_by_admin");
    expect(db.order.mock.calls).toEqual([["is_pinned", { ascending: false }], ["created_at", { ascending: false }]]);
    expect(db.limit).toHaveBeenCalledWith(100);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("keeps a genuinely empty result distinct from an error", async () => {
    db.limit.mockResolvedValue({ data: [], error: null });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, comments: [] });
  });

  it("returns the existing read error without creating an identity or writing", async () => {
    db.limit.mockResolvedValue({ data: null, error: new Error("database unavailable") });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = await GET();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ ok: false, message: "Impossible de charger les commentaires." });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(db.rpc).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
});
