import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PortfolioComment } from "@/types";

const service = vi.hoisted(() => ({ fetchCommentsService: vi.fn() }));
vi.mock("@/lib/commentService", () => service);

import { loadInitialComments, mergeInitialComments } from "@/lib/commentLoading";
import { scheduleVisibleTask } from "@/lib/visibleTask";

function comment(id: number, likes = 0): PortfolioComment {
  return { id, likes, name: "Visiteur", comment: "Très beau projet", image_url: null, replies: [], is_pinned: false, created_at: "2026-10-13T00:00:00Z" };
}

beforeEach(() => { service.fetchCommentsService.mockReset(); });
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("initial comment reconciliation", () => {
  it("keeps server ordering, including pinned comments, before any local action", () => {
    const fetched = [{ ...comment(1), is_pinned: true }, comment(3), comment(2)];
    expect(mergeInitialComments([], fetched)).toEqual(fetched);
  });

  it("retains a confirmed publication absent from an older read", () => {
    const published = comment(3);
    expect(mergeInitialComments([published], [comment(2), comment(1)])).toEqual([published, comment(2), comment(1)]);
  });

  it("avoids duplicating a publication already present in the read", () => {
    expect(mergeInitialComments([comment(3)], [comment(3), comment(2)])).toEqual([comment(3), comment(2)]);
  });

  it("preserves a confirmed like while keeping server metadata", () => {
    const fetched = { ...comment(3, 0), is_pinned: true, replies: [{ username: "Mamy", message: "Merci", created_at: "2026-10-13T00:00:00Z" }] };
    expect(mergeInitialComments([comment(3, 1)], [fetched])).toEqual([{ ...fetched, likes: 1 }]);
  });

  it("keeps a newer server like count", () => {
    expect(mergeInitialComments([comment(3, 1)], [comment(3, 4)])).toEqual([comment(3, 4)]);
  });

  it("keeps a publication even when the old read is empty", () => {
    expect(mergeInitialComments([comment(3)], [])).toEqual([comment(3)]);
  });
});

describe("asynchronous initial comment loading", () => {
  it("merges with state at response time rather than overwriting concurrent publications", async () => {
    let finish!: (value: PortfolioComment[]) => void;
    service.fetchCommentsService.mockReturnValue(new Promise<PortfolioComment[]>((resolve) => { finish = resolve; }));
    let comments: PortfolioComment[] = [];
    const controller = new AbortController();
    const error = vi.fn();
    const load = loadInitialComments(controller.signal, (update) => { comments = update(comments); }, error);
    comments = [comment(3, 1)];
    finish([comment(2), comment(1)]);
    await load;
    expect(comments).toEqual([comment(3, 1), comment(2), comment(1)]);
    expect(service.fetchCommentsService).toHaveBeenCalledWith(controller.signal);
    expect(error).not.toHaveBeenCalled();
  });

  it("does not send a read when it was already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await loadInitialComments(controller.signal, vi.fn(), vi.fn());
    expect(service.fetchCommentsService).not.toHaveBeenCalled();
  });

  it("ignores a late response after cancellation", async () => {
    let finish!: (value: PortfolioComment[]) => void;
    service.fetchCommentsService.mockReturnValue(new Promise<PortfolioComment[]>((resolve) => { finish = resolve; }));
    const controller = new AbortController();
    const update = vi.fn();
    const error = vi.fn();
    const load = loadInitialComments(controller.signal, update, error);
    controller.abort();
    finish([comment(1)]);
    await load;
    expect(update).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("does not present an aborted request as an error", async () => {
    const controller = new AbortController();
    service.fetchCommentsService.mockImplementation(async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });
    const error = vi.fn();
    await loadInitialComments(controller.signal, vi.fn(), error);
    expect(error).not.toHaveBeenCalled();
  });

  it("preserves content and exposes a real read error", async () => {
    service.fetchCommentsService.mockRejectedValue(new Error("Service indisponible"));
    const update = vi.fn();
    const error = vi.fn();
    await loadInitialComments(new AbortController().signal, update, error);
    expect(update).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("Service indisponible");
  });
});

describe("contact visibility scheduling", () => {
  function viewport(available = true, sectionPresent = true) {
    vi.useFakeTimers();
    const observe = vi.fn();
    const disconnect = vi.fn();
    let notify!: (visible: boolean) => void;
    class Observer {
      constructor(callback: IntersectionObserverCallback) {
        notify = (visible) => callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe = observe;
      disconnect = disconnect;
    }
    vi.stubGlobal("document", { getElementById: vi.fn(() => sectionPresent ? { id: "contact" } : null) });
    vi.stubGlobal("window", { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, ...(available ? { IntersectionObserver: Observer } : {}) });
    return { notify: (visible: boolean) => notify(visible), observe, disconnect };
  }

  it("leaves the home startup free of the comments read and starts once near Contact", () => {
    const { notify, observe } = viewport();
    const read = vi.fn();
    const cancel = scheduleVisibleTask("contact", read);
    notify(false);
    vi.runAllTimers();
    expect(read).not.toHaveBeenCalled();
    expect(observe).toHaveBeenCalledWith({ id: "contact" });
    notify(true);
    notify(true);
    vi.runAllTimers();
    expect(read).toHaveBeenCalledTimes(1);
    cancel();
  });

  it("loads when Contact is already visible, including a direct fragment link", () => {
    const { notify } = viewport();
    const read = vi.fn();
    const cancel = scheduleVisibleTask("contact", read);
    notify(true);
    vi.runAllTimers();
    expect(read).toHaveBeenCalledTimes(1);
    cancel();
  });

  it.each([[false, true], [true, false]])("falls back to an immediate read without observation (%s, %s)", (available, present) => {
    viewport(available, present);
    const read = vi.fn();
    const cancel = scheduleVisibleTask("contact", read);
    vi.runAllTimers();
    expect(read).toHaveBeenCalledTimes(1);
    cancel();
  });

  it("cancels a queued visibility read and ignores notifications after cleanup", () => {
    const { notify, disconnect } = viewport();
    const read = vi.fn();
    const cancel = scheduleVisibleTask("contact", read);
    notify(true);
    cancel();
    notify(true);
    vi.runAllTimers();
    expect(read).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });
});
