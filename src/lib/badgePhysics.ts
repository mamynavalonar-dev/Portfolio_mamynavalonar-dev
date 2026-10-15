type RapierModule = typeof import("@react-three/rapier");

const badgeMedia = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
let pendingModule: Promise<RapierModule> | undefined;

/** Charge les dépendances physiques du badge sans lancer sa simulation. */
export function loadBadgePhysicsModule(): Promise<RapierModule> {
  if (!pendingModule) {
    pendingModule = import("@react-three/rapier").catch((error) => {
      pendingModule = undefined;
      throw error;
    });
  }
  return pendingModule;
}

/** Anticipe uniquement le badge de l'accueil sur un écran où il est utilisé. */
export function preloadBadgePhysics(): Promise<RapierModule> | undefined {
  if (
    typeof window === "undefined" ||
    window.location.pathname !== "/" ||
    (window.location.hash && window.location.hash !== "#home") ||
    !window.matchMedia(badgeMedia).matches
  ) {
    return;
  }
  return loadBadgePhysicsModule();
}
