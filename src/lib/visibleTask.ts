/** Déclenche une tâche une fois, à l'approche d'une section déjà rendue. */
export function scheduleVisibleTask(id: string, task: () => void): () => void {
  let active = true;
  let scheduled = false;
  let timer: number | undefined;
  let observer: IntersectionObserver | undefined;

  const start = () => {
    if (!active || scheduled) return;
    scheduled = true;
    observer?.disconnect();
    timer = window.setTimeout(() => {
      if (active) task();
    }, 0);
  };

  const section = document.getElementById(id);
  if (section && typeof window.IntersectionObserver === "function") {
    observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      },
      { rootMargin: "300px 0px", threshold: 0 },
    );
    observer.observe(section);
  } else {
    start();
  }

  return () => {
    active = false;
    if (timer !== undefined) window.clearTimeout(timer);
    observer?.disconnect();
  };
}
