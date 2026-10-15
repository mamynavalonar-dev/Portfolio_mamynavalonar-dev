import type { JourneyEntry, TechStack } from "@/types";

const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });
export function formatJourneyPeriod(entry: Pick<JourneyEntry, "start_date" | "end_date" | "current">) {
  const start = monthFormatter.format(new Date(`${entry.start_date.slice(0, 10)}T00:00:00Z`));
  if (entry.current) return `${start} — Présent`;
  return entry.end_date ? `${start} — ${monthFormatter.format(new Date(`${entry.end_date.slice(0, 10)}T00:00:00Z`))}` : start;
}
export function sortJourney(entries: readonly JourneyEntry[]) {
  return [...entries].sort((a, b) => a.display_order - b.display_order || b.start_date.localeCompare(a.start_date) || a.id.localeCompare(b.id));
}
export function selectHeroTechnologies(technologies: readonly TechStack[]) {
  return technologies.filter((tech) => tech.hero_visible !== false).sort((a, b) =>
    (a.hero_order ?? 0) - (b.hero_order ?? 0) || a.created_at.localeCompare(b.created_at) || a.id - b.id,
  );
}
