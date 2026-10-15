import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ app: vi.fn(), physics: vi.fn() }));
vi.mock("@/components/band/App", () => ({ default: m.app }));
vi.mock("@/lib/badgePhysics", () => ({ loadBadgePhysicsModule: m.physics }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); m.physics.mockResolvedValue({}); });
afterEach(() => vi.unstubAllGlobals());
describe("early scene preload", () => {
  it.each(["/admin/social", "/portfolio/123"])("skips non-home route %s", async (pathname) => { vi.stubGlobal("window", { location: { pathname, hash: "" }, matchMedia: () => ({ matches: true }) }); const { preloadBadgeScene } = await import("@/lib/badgeScene"); expect(preloadBadgeScene()).toBeUndefined(); expect(m.physics).not.toHaveBeenCalled(); });
  it("skips server, mobile and reduced-motion contexts", async () => { vi.stubGlobal("window", undefined); const { preloadBadgeScene } = await import("@/lib/badgeScene"); expect(preloadBadgeScene()).toBeUndefined(); vi.stubGlobal("window", { location: { pathname: "/", hash: "" }, matchMedia: () => ({ matches: false }) }); expect(preloadBadgeScene()).toBeUndefined(); expect(m.physics).not.toHaveBeenCalled(); });
  it("skips a deep link to another section", async () => { vi.stubGlobal("window", { location: { pathname: "/", hash: "#contact" }, matchMedia: () => ({ matches: true }) }); const { preloadBadgeScene } = await import("@/lib/badgeScene"); expect(preloadBadgeScene()).toBeUndefined(); });
  it("shares the same scene import without mounting the badge or starting a simulation", async () => { vi.stubGlobal("window", { location: { pathname: "/", hash: "" }, matchMedia: () => ({ matches: true }) }); const { preloadBadgeScene, loadBadgeScene } = await import("@/lib/badgeScene"); const preload = preloadBadgeScene(); expect(loadBadgeScene()).toBe(preload); expect((await preload)?.default).toBe(m.app); expect(m.app).not.toHaveBeenCalled(); expect(m.physics).toHaveBeenCalledTimes(1); });
});
