export async function revalidatePortfolio() {
  try {
    const response = await fetch("/api/admin/revalidate", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("revalidation unavailable");
  } catch {
    // L'écriture métier est déjà confirmée ; la revalidation automatique reste
    // active. Ne pas présenter un échec d'enregistrement ni relancer l'écriture.
    console.warn("Données enregistrées ; actualisation publique automatique sous cinq minutes.");
  }
}
