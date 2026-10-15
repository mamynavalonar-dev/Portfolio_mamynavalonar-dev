import { loadBadgePhysicsModule } from "@/lib/badgePhysics";
import { markStartup } from "@/lib/startupMetrics";
type BadgeScene = typeof import("@/components/band/App");
let pendingScene: Promise<BadgeScene> | undefined;
const badgeMedia = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

export function loadBadgeScene(): Promise<BadgeScene> {
  if (!pendingScene) {
    markStartup("scene-requested");
    pendingScene = Promise.all([import("@/components/band/App"), loadBadgePhysicsModule()])
      .then(([scene]) => { markStartup("scene-imported"); return scene; }).catch((error) => { pendingScene = undefined; throw error; });
  }
  return pendingScene;
}
export function preloadBadgeScene(): Promise<BadgeScene> | undefined {
  if (typeof window === "undefined" || window.location.pathname !== "/" || (window.location.hash && window.location.hash !== "#home") || !window.matchMedia(badgeMedia).matches) return;
  // Les imports anticipent les scripts et les assets ; aucun canvas ni monde
  // physique ne sont montés avant le composant React normal.
  return loadBadgeScene();
}

// Dès que ce module client est évalué, donner de l'avance aux scripts 3D.
// Le contrôle de média garde les petits écrans et le mouvement réduit légers.
void preloadBadgeScene()?.catch(() => { /* Le composant gère un éventuel échec et le repli. */ });
