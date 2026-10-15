import type { JourneyEntry, PortfolioService } from "@/types";

export const SERVICE_ICONS = ["code", "database", "layers", "design", "shield", "cloud"] as const;
export const SERVICE_ACCENTS = ["blue", "emerald", "rose"] as const;
export const JOURNEY_KINDS = ["education", "experience", "project"] as const;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class ContentValidationError extends Error {}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContentValidationError("Données invalides.");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number, min = 0) {
  if (typeof value !== "string") throw new ContentValidationError(`${label} doit être un texte.`);
  const result = value.trim();
  if (result.length < min || result.length > max) throw new ContentValidationError(`${label} : entre ${min} et ${max} caractères.`);
  return result;
}
function bool(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new ContentValidationError(`${label} doit être activé ou désactivé.`);
  return value;
}
function choice<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new ContentValidationError(`${label} invalide.`);
  return value as T;
}
function list(value: unknown, label: string, maxItems: number, maxLength: number, minItems = 0) {
  if (!Array.isArray(value) || value.length < minItems || value.length > maxItems) throw new ContentValidationError(`${label} : ${minItems} à ${maxItems} éléments.`);
  return [...new Set(value.map((item) => text(item, label, maxLength, 1)))];
}
export function validateDisplayOrder(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 9999) throw new ContentValidationError("L'ordre doit être un entier entre 0 et 9999.");
  return value;
}
function month(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])(?:-01)?$/.test(value)) throw new ContentValidationError(`${label} : mois et année valides requis.`);
  return `${value.slice(0, 7)}-01`;
}
function safeHttpsUrl(value: unknown, label: string): string | null {
  if (value === null || value === "") return null;
  const input = text(value, label, 1000, 1);
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new ContentValidationError(`${label} doit être une adresse HTTPS valide.`); }
}
function logoUrl(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("/assets/") && !value.includes("..") && /^\/assets\/[A-Za-z0-9._/-]+$/.test(value)) return text(value, "Le logo", 1000, 1);
  // Le navigateur ne peut jamais enregistrer une URL temporaire blob:.
  return safeHttpsUrl(value, "Le logo");
}

export type ServiceInput = Omit<PortfolioService, "id" | "created_at" | "updated_at">;
export type JourneyInput = Omit<JourneyEntry, "id" | "created_at" | "updated_at">;

export function validateServiceInput(value: unknown): ServiceInput {
  const input = object(value);
  return {
    title: text(input.title, "Le titre", 100, 2),
    summary: text(input.summary, "Le résumé", 260, 3),
    description: text(input.description, "La description", 2000, 3),
    bullet_points: list(input.bullet_points, "Les prestations", 12, 240, 1),
    icon: choice(input.icon, SERVICE_ICONS, "L'icône"),
    accent: choice(input.accent, SERVICE_ACCENTS, "La couleur"),
    display_order: validateDisplayOrder(input.display_order),
    published: bool(input.published, "La publication"),
  };
}

export function validateJourneyInput(value: unknown): JourneyInput {
  const input = object(value);
  const kind = choice(input.kind, JOURNEY_KINDS, "La catégorie");
  const start_date = month(input.start_date, "Le début");
  const current = bool(input.current, "La période en cours");
  const end_date = input.end_date === null || input.end_date === "" ? null : month(input.end_date, "La fin");
  if (current && end_date) throw new ContentValidationError("Une période en cours ne peut pas avoir de date de fin.");
  if (end_date && end_date < start_date) throw new ContentValidationError("La fin doit être postérieure ou égale au début.");
  const project_id = input.project_id === null || input.project_id === "" ? null : text(input.project_id, "Le projet", 36, 36);
  if (project_id && (!UUID_PATTERN.test(project_id) || kind !== "project")) throw new ContentValidationError("Le projet lié doit correspondre à une entrée de type Projet.");
  return {
    kind, title: text(input.title, "Le titre", 140, 2),
    organization: text(input.organization, "L'établissement ou l'entreprise", 140, 2),
    description: text(input.description, "La description", 2000),
    start_date, end_date, current,
    tags: list(input.tags, "Les compétences", 16, 48),
    logo_url: logoUrl(input.logo_url), project_id,
    external_url: safeHttpsUrl(input.external_url, "Le lien"),
    display_order: validateDisplayOrder(input.display_order),
    published: bool(input.published, "La publication"),
  };
}
