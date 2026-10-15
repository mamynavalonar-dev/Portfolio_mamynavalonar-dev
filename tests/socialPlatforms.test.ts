import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SOCIAL_PLATFORMS } from "@/lib/socialDefaults";
import { validateSocialLink } from "@/lib/socialValidation";
import SocialLinks from "@/components/sections/contact/SocialLinks";
import type { SocialLink, SocialPlatform } from "@/types";

const input = (platform: SocialPlatform, url = "https://example.com/profil") => ({ platform, title: "Mon profil", display_name: "@monprofil", url, featured: false, published: true, display_order: 0 });
describe("extended social platforms", () => {
  it("accepts TikTok and a named platform outside the icon list", () => {
    expect(validateSocialLink(input("tiktok", "https://www.tiktok.com/@monprofil")).platform).toBe("tiktok");
    const custom = validateSocialLink({ ...input("other"), title: "Mon réseau personnalisé" });
    expect(custom.platform).toBe("other"); expect(custom.title).toBe("Mon réseau personnalisé");
    expect(SOCIAL_PLATFORMS.tiktok).toBe("TikTok"); expect(SOCIAL_PLATFORMS.other).toBe("Autre réseau");
  });
  it.each(["tiktok", "other"] as const)("retains HTTPS validation for %s", (platform) => {
    for (const url of ["javascript:alert(1)", "http://example.com", "data:text/html,test", "mailto:user@example.com", "https://user:pass@example.com"]) expect(() => validateSocialLink(input(platform, url))).toThrow();
  });
  it("keeps unrecognized platform identifiers rejected", () => {
    expect(() => validateSocialLink({ ...input("other"), platform: "unknown" })).toThrow();
    expect(() => validateSocialLink({ ...input("other"), platform: "__proto__" })).toThrow();
  });
  it("renders both new choices with their labels and only publishes enabled links", () => {
    const make = (platform: SocialPlatform, order: number, published = true): SocialLink => ({ ...input(platform), id: platform, title: platform === "tiktok" ? "Mon TikTok" : "Mon autre réseau", display_order: order, published, created_at: "", updated_at: "" });
    const html = renderToStaticMarkup(createElement(SocialLinks, { content: { settings: { heading: "Mes réseaux", introduction: "" }, links: [make("other", 1), make("tiktok", 0)] } }));
    expect(html.indexOf("Mon TikTok")).toBeLessThan(html.indexOf("Mon autre réseau"));
    expect(html).toContain('rel="noopener noreferrer"');
    expect(renderToStaticMarkup(createElement(SocialLinks, { content: { settings: { heading: "Mes réseaux", introduction: "" }, links: [make("tiktok", 0, false)] } }))).toBe("");
  });
  it("keeps the database constraint aligned with the complete form choices", () => {
    const sql = readFileSync(new URL("../supabase/migrations/20261015120000_extend_social_platforms.sql", import.meta.url), "utf8");
    const constraint = sql.match(/check\s*\(platform\s+in\s*\(([\s\S]*?)\)\)/i)?.[1] ?? "";
    const platforms = [...constraint.matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
    expect(platforms.sort()).toEqual(Object.keys(SOCIAL_PLATFORMS).sort());
  });
});
