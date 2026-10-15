import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCommentsService } from "@/lib/commentService";

afterEach(() => vi.unstubAllGlobals());

describe("comment read transport", () => {
  it("forwards cancellation and preserves the no-store read policy", async () => {
    const fetch = vi.fn(async () => Response.json({ ok: true, comments: [{ id: 3, name: "Visiteur", likes: 1 }] }));
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    expect(await fetchCommentsService(signal)).toEqual([{ id: 3, name: "Visiteur", likes: 1 }]);
    expect(fetch).toHaveBeenCalledWith("/api/comments", { cache: "no-store", signal });
  });

  it("still works when the caller does not provide a signal", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, comments: [] })));
    expect(await fetchCommentsService()).toEqual([]);
  });

  it("preserves the API error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: false, message: "Service indisponible" }, { status: 500 })));
    await expect(fetchCommentsService()).rejects.toThrow("Service indisponible");
  });

  it("propagates an aborted transport to the cancellation-aware loader", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("Aborted", "AbortError"); }));
    await expect(fetchCommentsService(new AbortController().signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});
