"use client";

import { useMemo, useSyncExternalStore, type RefObject } from "react";

function createActivityStore<T extends Element>(ref: RefObject<T | null>) {
    let inView = false;
    let active = false;
    let observer: IntersectionObserver | undefined;
    const listeners = new Set<() => void>();
    const update = () => {
      const next = inView && document.visibilityState === "visible";
      if (next !== active) { active = next; for (const notify of listeners) notify(); }
    };
    return {
      snapshot: () => active,
      subscribe: (notify: () => void) => {
        listeners.add(notify);
        if (listeners.size === 1 && ref.current) {
          if (typeof IntersectionObserver === "undefined") { inView = true; update(); }
          else {
            observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); }, { rootMargin: "0px" });
            observer.observe(ref.current);
          }
          document.addEventListener("visibilitychange", update);
        }
        return () => {
          listeners.delete(notify);
          if (!listeners.size) {
            observer?.disconnect(); observer = undefined;
            document.removeEventListener("visibilitychange", update);
            inView = false; active = false;
          }
        };
      },
    };
}

export default function useElementActivity<T extends Element>(ref: RefObject<T | null>) {
  const store = useMemo(() => createActivityStore(ref), [ref]);
  return useSyncExternalStore(store.subscribe, store.snapshot, () => false);
}
