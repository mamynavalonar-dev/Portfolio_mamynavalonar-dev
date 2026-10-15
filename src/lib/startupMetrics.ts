// Repères locaux lisibles dans Performance et par le script d'audit. Aucun
// journal, identifiant ou résultat n'est envoyé à un service externe.
export function markStartup(name: "scene-requested" | "scene-imported" | "scene-first-frame" | "badge-ready" | "intro-complete" | "intro-entrance-started" | "badge-visible") {
  if (typeof window === "undefined") return;
  try {
    const key = `portfolio:${name}`;
    if (!performance.getEntriesByName(key).length) performance.mark(key);
  } catch { /* Une mesure facultative ne doit jamais bloquer l'affichage. */ }
}

declare global {
  interface Window { __portfolioPerformanceProbe?: { badgeFrame?: () => void }; }
}
export function recordBadgeFrame() {
  if (typeof window === "undefined") return;
  try { window.__portfolioPerformanceProbe?.badgeFrame?.(); } catch { /* Diagnostic facultatif. */ }
}
