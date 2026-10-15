import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ after: vi.fn(), tag: vi.fn(), path: vi.fn(), callbacks: [] as Array<() => unknown> }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("next/cache", () => ({ revalidateTag: m.tag, revalidatePath: m.path }));
import { scheduleAdminPublicRefresh } from "@/lib/adminPublicRefresh";
beforeEach(() => { vi.resetAllMocks(); m.callbacks = []; m.after.mockImplementation((callback: () => unknown) => m.callbacks.push(callback)); });

describe("actualisation publique après la réponse de sauvegarde", () => {
  it("répond avant l'invalidation et annonce qu'elle est programmée", () => {
    expect(scheduleAdminPublicRefresh()).toEqual({ revalidated: false, revalidationScheduled: true });
    expect(m.tag).not.toHaveBeenCalled();
    expect(m.path).not.toHaveBeenCalled();
    expect(m.callbacks).toHaveLength(1);
    m.callbacks[0]();
    expect(m.tag).toHaveBeenCalledWith("public-portfolio", { expire: 0 });
    expect(m.path).toHaveBeenCalledWith("/");
  });
  it("ne remet pas en cause une écriture confirmée si le cache échoue ensuite", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const confirmed = scheduleAdminPublicRefresh();
    m.tag.mockImplementation(() => { throw new Error("cache unavailable"); });
    expect(() => m.callbacks[0]()).not.toThrow();
    expect(confirmed.revalidationScheduled).toBe(true);
    vi.restoreAllMocks();
  });
  it("assure une invalidation directe si la programmation n'est pas disponible", () => {
    m.after.mockImplementation(() => { throw new Error("no request context"); });
    expect(scheduleAdminPublicRefresh()).toEqual({ revalidated: true, revalidationScheduled: false });
    expect(m.tag).toHaveBeenCalledOnce();
  });
});
