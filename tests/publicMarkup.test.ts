import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
import HomeClient from "@/app/HomeClient";
import ProjectDetailClient from "@/app/portfolio/[id]/ProjectDetailClient";
import PortfolioCard from "@/components/sections/PortfolioCard";
import type { Project } from "@/types";
const project: Project = { id: "11111111-1111-4111-8111-111111111111", title: "Projet", description: "Description visible", technologies: ["React"], key_features: ["Galerie"], image_url: "/assets/PP.webp", image_urls: ["/assets/PP.webp", "/assets/bandd.png"], live_url: null, github_url: null, created_at: "2026-01-01T00:00:00Z" };
beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => vi.unstubAllGlobals());
describe("server-rendered public navigation", () => {
  it("renders a crawlable project link while retaining the modal button", () => {
    const html = renderToStaticMarkup(createElement(PortfolioCard, { ...project, index: 0, image: project.image_url }));
    expect(html).toContain(`href="/portfolio/${project.id}"`);
    expect(html).toContain("Ouvrir les détails du projet");
    expect(html).not.toContain("opacity:0");
  });
  it("has one h1 and visible essential content beneath the decorative intro", () => {
    const html = renderToStaticMarkup(createElement(HomeClient, { initialPortfolio: { projects: [project], certificates: [], techStacks: [] } }));
    expect((html.match(/<h1(?:\s|>)/g) || []).length).toBe(1);
    expect(html).toContain(`href="/portfolio/${project.id}"`);
    expect(html).toContain("data-portfolio-intro");
    expect(html).toContain('data-intro-pending="true"'); expect(html).toContain('data-portfolio-content=""');
    expect(html).toContain('position:fixed;inset:0;z-index:9999;background-color:#000');
    expect(html).toContain("visibility: hidden"); expect(html).toContain("visibility: visible !important");
    const essential = html.slice(html.indexOf('id="home"'), html.indexOf('data-portfolio-intro=""'));
    const hiddenStyles = (essential.match(/style="[^"]*"/g) || []).filter((style) => /(?:style="|;)opacity:0(?:;|")/.test(style));
    expect(hiddenStyles).toEqual([]);
    expect(html).toContain("Ce message privé"); expect(html).toContain("seront publics");
  });
  it("anchors the scroll prompt independently of motion transforms", () => { const html = renderToStaticMarkup(createElement(HomeClient, { initialPortfolio: { projects: [], certificates: [], techStacks: [] } })); expect(html).toContain('data-scroll-anchor=""'); const anchor = html.slice(html.indexOf('data-scroll-anchor=""'), html.indexOf('id="about"')); expect(anchor).not.toContain("-translate-x-1/2"); expect(html).toContain('data-hero-name=""'); expect(html).toContain("Développeur Full Stack junior"); });
  it("uses a native zoom button and optimized gallery image in detail HTML", () => {
    const html = renderToStaticMarkup(createElement(ProjectDetailClient, { initialProject: project }));
    expect(html).toContain("Agrandir l&#x27;image 1");
    expect(html).toContain("/_next/image?");
    expect(html).toContain('href="/#portfolio"');
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain("opacity:0");
  });
  it("renders touch targets independently of the visual dot size", () => {
    const html = renderToStaticMarkup(createElement(ProjectDetailClient, { initialProject: project }));
    expect(html).toContain("w-11 h-11");
    expect(html).toContain("w-6 h-1.5 bg-white");
  });
});
