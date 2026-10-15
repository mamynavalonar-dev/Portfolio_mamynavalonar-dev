import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ServicesSection from "@/components/sections/ServicesSection";
import JourneySection from "@/components/sections/JourneySection";
import TechnologyMarquee from "@/components/sections/TechnologyMarquee";
import type { JourneyEntry, PortfolioService, TechStack } from "@/types";
const service: PortfolioService = { id: "service", title: "Service public", summary: "Résumé du service", description: "Description du service", bullet_points: ["React"], icon: "code", accent: "blue", display_order: 0, published: true, created_at: "", updated_at: "" };
const entry: JourneyEntry = { id: "entry", kind: "education", title: "Formation publique", organization: "Établissement", description: "", start_date: "2023-09-01", end_date: "2025-06-01", current: false, tags: ["React"], logo_url: null, project_id: null, external_url: null, display_order: 0, published: true, created_at: "", updated_at: "" };
describe("new sections server rendering", () => {
  it("renders service content and detail controls directly in server HTML", () => { const html = renderToStaticMarkup(createElement(ServicesSection, { services: [service] })); expect(html).toContain('id="services"'); expect(html).toContain("Service public"); expect(html).toContain('aria-haspopup="dialog"'); expect(html).not.toContain("<h1"); });
  it("hides drafts and omits empty sections", () => { expect(renderToStaticMarkup(createElement(ServicesSection, { services: [{ ...service, published: false }] }))).toBe(""); expect(renderToStaticMarkup(createElement(JourneySection, { entries: [] }))).toBe(""); });
  it("renders a deterministic initial timeline and accessible category tabs", () => { const html = renderToStaticMarkup(createElement(JourneySection, { entries: [entry] })); expect(html).toContain('role="tablist"'); expect(html).toContain('role="tabpanel"'); expect(html).toContain("Formation publique"); expect(html).toContain("sept. 2023 — juin 2025"); expect(html).not.toContain("<h1"); });
  it("selects an available category when no formation was published", () => { const html = renderToStaticMarkup(createElement(JourneySection, { entries: [{ ...entry, kind: "project", project_id: "11111111-1111-4111-8111-111111111111" }] })); expect(html).toContain('aria-labelledby="journey-tab-project"'); expect(html).toContain('href="/portfolio/11111111-1111-4111-8111-111111111111"'); });
  it("keeps technology names server-visible while deferring logo requests until the intro ends", () => { const techs: TechStack[] = [{ id: 1, name: "React", logo_url: "https://storage.test/react.svg", created_at: "" }, { id: 2, name: "Private technology", logo_url: "", created_at: "", hero_visible: false }]; const html = renderToStaticMarkup(createElement(TechnologyMarquee, { technologies: techs, enabled: false })); expect(html).toContain("React"); expect(html).toContain('aria-hidden="true"'); expect(html).toContain('data-running="false"'); expect(html).not.toContain("Private technology"); expect(html).not.toContain("<img"); });
});
