import type { PublicPortfolioData } from "@/types";

/** Actualise les données déjà affichées seulement à l'approche du portfolio. */
export function schedulePortfolioRefresh(
  initialPortfolio: PublicPortfolioData | undefined,
  refresh: () => void,
): () => void {
  let active = true;
  let scheduled = false;
  let timer: number | undefined;
  let observer: IntersectionObserver | undefined;

  const start = () => {
    if (!active || scheduled) return;
    scheduled = true;
    observer?.disconnect();
    timer = window.setTimeout(() => {
      if (active) refresh();
    }, 0);
  };

  const completeInitialData = initialPortfolio && !initialPortfolio.unavailable?.length;
  const section = completeInitialData ? document.getElementById("portfolio") : null;

  if (section && typeof window.IntersectionObserver === "function") {
    observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      },
      { rootMargin: "300px 0px", threshold: 0 },
    );
    observer.observe(section);
  } else {
    // Sans données complètes, ou sans observation possible, récupère tout de suite.
    start();
  }

  return () => {
    active = false;
    if (timer !== undefined) window.clearTimeout(timer);
    observer?.disconnect();
  };
}
