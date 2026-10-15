import type { SocialLink, SocialPlatform, SocialSettings } from "@/types";
import { ContentValidationError, validateDisplayOrder } from "@/lib/portfolioContentValidation";
import { SOCIAL_PLATFORMS } from "@/lib/socialDefaults";
function inputObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContentValidationError("Données invalides.");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number, min = 0) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new ContentValidationError(`${label} : ${min} à ${max} caractères.`);
  return value.trim();
}
function boolean(value: unknown) { if (typeof value !== "boolean") throw new ContentValidationError("Les options doivent être activées ou désactivées."); return value; }
export function validateSocialSettings(value: unknown): SocialSettings {
  const input = inputObject(value);
  return { heading: text(input.heading, "Le titre", 100, 2), introduction: text(input.introduction, "L’introduction", 600) };
}
export type SocialLinkInput = Omit<SocialLink, "id" | "created_at" | "updated_at">;
export function validateSocialLink(value: unknown): SocialLinkInput {
  const input = inputObject(value);
  if (typeof input.platform !== "string" || !Object.hasOwn(SOCIAL_PLATFORMS, input.platform)) throw new ContentValidationError("Réseau non reconnu.");
  const platform = input.platform as SocialPlatform;
  const raw = text(input.url, "Le lien", 1000, 1);
  let url: URL;
  try {
    url = new URL(raw);
    if (platform === "email") {
      const address = decodeURIComponent(url.pathname);
      if (url.protocol !== "mailto:" || url.search || url.hash || address.length > 254 || !/^[^\s@,;<>/?]+@[^\s@,;<>/?]+\.[^\s@,;<>/?]+$/.test(address)) throw new Error();
    } else if (url.protocol !== "https:" || url.username || url.password) throw new Error();
  } catch { throw new ContentValidationError(platform === "email" ? "Utilisez mailto: suivi d’une adresse e-mail valide." : "Utilisez un lien HTTPS valide, sans identifiant ni mot de passe."); }
  return {
    platform, title: text(input.title, "Le nom affiché", 80, 2), display_name: text(input.display_name, "Le sous-titre", 120), url: url.href,
    featured: boolean(input.featured), published: boolean(input.published), display_order: validateDisplayOrder(input.display_order),
  };
}
