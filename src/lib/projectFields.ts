import type { Project } from "@/types";

export function toStringList(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,\n]/)
      : [];

  return values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeProject<T extends Record<string, unknown>>(
  project: T,
): T & Project {
  return {
    ...project,
    technologies: toStringList(project.technologies),
    key_features: toStringList(project.key_features),
  } as T & Project;
}

export function listToInput(value: unknown) {
  return toStringList(value).join(", ");
}
