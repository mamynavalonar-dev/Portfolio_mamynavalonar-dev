import { describe, expect, it } from "vitest";
import { validateSocialLink, validateSocialSettings } from "@/lib/socialValidation";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import SocialLinks from "@/components/sections/contact/SocialLinks";
import { DEFAULT_SOCIAL_CONTENT } from "@/lib/socialDefaults";
const input = () => ({ platform: "github", title: " GitHub ", display_name: " @mon_profil ", url: "https://github.com/mon-profil", featured: false, published: true, display_order: 2 });
describe("social links validation", () => {
  it("trims labels and retains publication and ordering", () => { const result = validateSocialLink(input()); expect(result.title).toBe("GitHub"); expect(result.display_name).toBe("@mon_profil"); expect(result.display_order).toBe(2); });
  it.each(["javascript:alert(1)", "data:text/html,test", "http://example.com", "https://name:password@example.com", "blob:preview"])("rejects unsafe link %s", (url) => expect(() => validateSocialLink({ ...input(), url })).toThrow());
  it.each([{ platform: "unknown" }, { platform: "__proto__" }, { display_order: -1 }, { display_order: 1.5 }, { published: "true" }, { title: "x" }])("rejects malformed fields %j", (fields) => expect(() => validateSocialLink({ ...input(), ...fields })).toThrow());
  it("accepts a simple mailto link only for the email icon", () => { expect(validateSocialLink({ ...input(), platform: "email", url: "mailto:hello@example.com" }).url).toBe("mailto:hello@example.com"); expect(() => validateSocialLink({ ...input(), url: "mailto:hello@example.com" })).toThrow(); });
  it.each(["mailto:invalid", "mailto:hello@example.com?body=test", "mailto:a%0Ab@example.com", "https://example.com"])("rejects invalid email links %s", (url) => expect(() => validateSocialLink({ ...input(), platform: "email", url })).toThrow());
  it("supports the heading and optional introductory text", () => { expect(validateSocialSettings({ heading: " Retrouvez-moi ", introduction: " Une introduction. " })).toEqual({ heading: "Retrouvez-moi", introduction: "Une introduction." }); });
  it("rejects overlong or malformed introductory text", () => { expect(() => validateSocialSettings({ heading: "Réseaux", introduction: "x".repeat(601) })).toThrow(); expect(() => validateSocialSettings({ heading: "x", introduction: "" })).toThrow(); });
});
describe("public social links", () => {
  it("renders only published links with configured labels, order and introduction", () => {
    const html = renderToStaticMarkup(createElement(SocialLinks, { content: { settings: { heading: "Mes profils", introduction: "Échangeons ici." }, links: [{ ...DEFAULT_SOCIAL_CONTENT.links[0], published: false }, { ...DEFAULT_SOCIAL_CONTENT.links[2], title: "Mon code", display_order: 0 }, { ...DEFAULT_SOCIAL_CONTENT.links[1], display_order: 1 }] } }));
    expect(html).toContain("Mes profils"); expect(html).toContain("Échangeons ici."); expect(html).toContain("Mon code"); expect(html).not.toContain("linkedin.com"); expect(html.indexOf("Mon code")).toBeLessThan(html.indexOf("Instagram")); expect(html).toContain('rel="noopener noreferrer"');
  });
  it("does not restore defaults after all configured links were removed", () => expect(renderToStaticMarkup(createElement(SocialLinks, { content: { settings: DEFAULT_SOCIAL_CONTENT.settings, links: [] } }))).toBe(""));
});
