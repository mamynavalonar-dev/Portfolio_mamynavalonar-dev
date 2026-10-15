import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const physics = vi.hoisted(() => ({ Physics: vi.fn(), RigidBody: vi.fn() }));
vi.mock("@react-three/rapier", () => physics);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => vi.unstubAllGlobals());

function browser(pathname: string, matches: boolean, hash = "") {
  const matchMedia = vi.fn(() => ({ matches }));
  vi.stubGlobal("window", { location: { pathname, hash }, matchMedia });
  return matchMedia;
}

describe("badge physics module preloading", () => {
  it("does not load from a server context", async () => {
    vi.stubGlobal("window", undefined);
    const { preloadBadgePhysics } = await import("@/lib/badgePhysics");
    expect(preloadBadgePhysics()).toBeUndefined();
  });

  it("skips screens where the badge is disabled", async () => {
    const matchMedia = browser("/", false);
    const { preloadBadgePhysics } = await import("@/lib/badgePhysics");
    expect(preloadBadgePhysics()).toBeUndefined();
    expect(matchMedia).toHaveBeenCalledWith("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
  });

  it.each(["/admin/login", "/admin/projects", "/portfolio/project-id"])(
    "does not preload on %s",
    async (pathname) => {
      const matchMedia = browser(pathname, true);
      const { preloadBadgePhysics } = await import("@/lib/badgePhysics");
      expect(preloadBadgePhysics()).toBeUndefined();
      expect(matchMedia).not.toHaveBeenCalled();
    },
  );

  it("starts early on desktop home and shares the same promise with normal badge loading", async () => {
    browser("/", true);
    const { preloadBadgePhysics, loadBadgePhysicsModule } = await import("@/lib/badgePhysics");
    const early = preloadBadgePhysics();
    expect(early).toBeInstanceOf(Promise);
    expect(loadBadgePhysicsModule()).toBe(early);
    expect(loadBadgePhysicsModule()).toBe(early);
    const loaded = await early;
    expect(loaded?.Physics).toBe(physics.Physics);
    expect(loadBadgePhysicsModule()).toBe(early);
  });

  it("leaves direct links to other sections to normal on-demand loading", async () => {
    browser("/", true, "#portfolio");
    const { preloadBadgePhysics } = await import("@/lib/badgePhysics");
    expect(preloadBadgePhysics()).toBeUndefined();
  });

  it("does not initialize physics or create a world while preloading", async () => {
    browser("/", true);
    const { preloadBadgePhysics } = await import("@/lib/badgePhysics");
    await preloadBadgePhysics();
    expect(physics.Physics).not.toHaveBeenCalled();
    expect(physics.RigidBody).not.toHaveBeenCalled();
  });

  it("still loads on demand after preloading was skipped", async () => {
    browser("/", false);
    const { preloadBadgePhysics, loadBadgePhysicsModule } = await import("@/lib/badgePhysics");
    expect(preloadBadgePhysics()).toBeUndefined();
    expect((await loadBadgePhysicsModule()).Physics).toBe(physics.Physics);
    expect(physics.Physics).not.toHaveBeenCalled();
  });
});
