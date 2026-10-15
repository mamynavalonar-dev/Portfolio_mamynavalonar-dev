import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPortfolioData } from "@/types";
import { schedulePortfolioRefresh } from "@/lib/portfolioRefresh";

const completePortfolio: PublicPortfolioData = {
  projects: [],
  certificates: [],
  techStacks: [],
};

let notify: (intersecting: boolean) => void;
let observe: ReturnType<typeof vi.fn>;
let disconnect: ReturnType<typeof vi.fn>;
let refresh: ReturnType<typeof vi.fn<() => void>>;
let getElementById: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  observe = vi.fn();
  disconnect = vi.fn();
  refresh = vi.fn();
  getElementById = vi.fn(() => ({ id: "portfolio" }));

  class Observer {
    constructor(callback: IntersectionObserverCallback) {
      notify = (intersecting) => callback(
        [{ isIntersecting: intersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }

    observe = observe;
    disconnect = disconnect;
  }

  vi.stubGlobal("window", {
    IntersectionObserver: Observer,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal("document", { getElementById });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("portfolio refresh scheduling", () => {
  it("keeps complete server data without a startup request, including empty collections", () => {
    const cancel = schedulePortfolioRefresh(completePortfolio, refresh);
    vi.runAllTimers();
    expect(refresh).not.toHaveBeenCalled();
    expect(observe).toHaveBeenCalledWith({ id: "portfolio" });
    cancel();
  });

  it("ignores an offscreen notification and refreshes once when the section approaches", () => {
    const cancel = schedulePortfolioRefresh(completePortfolio, refresh);
    notify(false);
    vi.runAllTimers();
    expect(refresh).not.toHaveBeenCalled();
    notify(true);
    notify(true);
    vi.runAllTimers();
    notify(false);
    notify(true);
    vi.runAllTimers();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalled();
    cancel();
  });

  it("refreshes when the portfolio is already visible, as with a direct fragment link", () => {
    const cancel = schedulePortfolioRefresh(completePortfolio, refresh);
    notify(true);
    vi.runAllTimers();
    expect(refresh).toHaveBeenCalledTimes(1);
    cancel();
  });

  it("loads immediately when no server snapshot was supplied", () => {
    const cancel = schedulePortfolioRefresh(undefined, refresh);
    expect(observe).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(refresh).toHaveBeenCalledTimes(1);
    cancel();
  });

  it.each(["projects", "certificates", "techStacks"] as const)(
    "recovers immediately when the server could not load %s",
    (collection) => {
      const cancel = schedulePortfolioRefresh({ ...completePortfolio, unavailable: [collection] }, refresh);
      expect(observe).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(refresh).toHaveBeenCalledTimes(1);
      cancel();
    },
  );

  it("uses the immediate fallback when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("window", { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
    const cancel = schedulePortfolioRefresh(completePortfolio, refresh);
    vi.runAllTimers();
    expect(refresh).toHaveBeenCalledTimes(1);
    cancel();
  });

  it("uses the immediate fallback when the portfolio section is absent", () => {
    getElementById.mockReturnValue(null);
    const cancel = schedulePortfolioRefresh(completePortfolio, refresh);
    vi.runAllTimers();
    expect(refresh).toHaveBeenCalledTimes(1);
    cancel();
  });

  it("cancels an immediate request on cleanup", () => {
    const cancel = schedulePortfolioRefresh(undefined, refresh);
    cancel();
    vi.runAllTimers();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("ignores observer notifications after cleanup", () => {
    const cancel = schedulePortfolioRefresh(completePortfolio, refresh);
    cancel();
    notify(true);
    vi.runAllTimers();
    expect(refresh).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });

  it("cancels a visibility request that is queued before cleanup", () => {
    const cancel = schedulePortfolioRefresh(completePortfolio, refresh);
    notify(true);
    cancel();
    vi.runAllTimers();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("survives setup, cleanup, and setup without issuing duplicate requests", () => {
    const cancelFirst = schedulePortfolioRefresh(completePortfolio, refresh);
    const notifyFirst = notify;
    cancelFirst();
    const cancelSecond = schedulePortfolioRefresh(completePortfolio, refresh);
    notifyFirst(true);
    notify(true);
    vi.runAllTimers();
    expect(refresh).toHaveBeenCalledTimes(1);
    cancelSecond();
  });
});
