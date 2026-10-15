import type { PortfolioComment } from "@/types";
import { fetchCommentsService } from "@/lib/commentService";

/** Préserve les publications et votes confirmés pendant la lecture initiale. */
export function mergeInitialComments(
  current: PortfolioComment[],
  fetched: PortfolioComment[],
): PortfolioComment[] {
  const remote = new Map(fetched.map((item) => [item.id, item]));
  const seen = new Set<number>();
  const merged: PortfolioComment[] = [];

  for (const item of current) {
    if (seen.has(item.id)) continue;
    const match = remote.get(item.id);
    merged.push(match ? { ...match, likes: Math.max(match.likes, item.likes) } : item);
    seen.add(item.id);
  }
  for (const item of fetched) {
    if (seen.has(item.id)) continue;
    merged.push(item);
    seen.add(item.id);
  }
  return merged;
}

export async function loadInitialComments(
  signal: AbortSignal,
  update: (updater: (current: PortfolioComment[]) => PortfolioComment[]) => void,
  onError: (message: string) => void,
): Promise<void> {
  if (signal.aborted) return;
  try {
    const fetched = await fetchCommentsService(signal);
    if (signal.aborted) return;
    update((current) => mergeInitialComments(current, fetched));
  } catch (error) {
    if (signal.aborted) return;
    onError(error instanceof Error ? error.message : "Impossible de charger les commentaires.");
  }
}
