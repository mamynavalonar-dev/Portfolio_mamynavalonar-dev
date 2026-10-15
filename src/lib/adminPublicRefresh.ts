import "server-only";
import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

function refreshPublicContent() {
  try {
    revalidateTag("public-portfolio", { expire: 0 });
    revalidatePath("/");
    return true;
  } catch {
    console.warn("Contenu enregistré ; revalidation automatique sous cinq minutes.");
    return false;
  }
}

// À appeler uniquement après confirmation de l'écriture. Next maintient
// l'exécution après la réponse, y compris sur Vercel ; pas de promesse détachée.
export function scheduleAdminPublicRefresh() {
  try {
    after(() => { refreshPublicContent(); });
    return { revalidated: false, revalidationScheduled: true };
  } catch {
    // Un environnement sans cycle de vie after() peut encore invalider le
    // cache directement. Une panne du cache ne transforme jamais le SQL en échec.
    return { revalidated: refreshPublicContent(), revalidationScheduled: false };
  }
}
