export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Concurrence invalide");
  const results: R[] = new Array(items.length);
  let next = 0;
  let failed = false;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (!failed) {
      const index = next++;
      if (index >= items.length) return;
      try { results[index] = await task(items[index], index); }
      catch (error) { failed = true; throw error; }
    }
  });
  // Attendre aussi les tâches déjà démarrées avant de signaler un échec.
  const finished = await Promise.allSettled(workers);
  const rejected = finished.find((result) => result.status === "rejected");
  if (rejected?.status === "rejected") throw rejected.reason;
  return results;
}
