import { preloadBadgeScene } from "@/lib/badgeScene";

// Lance le téléchargement avant l'hydratation, sans attendre ni simuler le badge.
// Si le préchargement échoue, son chargement normal pourra réessayer.
void preloadBadgeScene()?.catch(() => {});
