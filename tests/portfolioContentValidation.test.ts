import { describe, expect, it } from "vitest";
import { validateJourneyInput, validateServiceInput } from "@/lib/portfolioContentValidation";
import { formatJourneyPeriod, selectHeroTechnologies, sortJourney } from "@/lib/journey";
import type { JourneyEntry, TechStack } from "@/types";

const service = () => ({ title: " Interface web ", summary: "Une interface responsive.", description: "Une description détaillée.", bullet_points: ["React", "React", "Accessibilité"], icon: "code", accent: "blue", display_order: 2, published: false });
const journey = () => ({ kind: "education", title: "Formation web", organization: "Établissement", description: "", start_date: "2023-09", end_date: "2025-06", current: false, tags: ["TypeScript", "TypeScript"], logo_url: null, project_id: null, external_url: null, display_order: 0, published: false });
describe("portfolio content validation", () => {
  it("trims service fields and removes duplicate bullet points", () => { const result = validateServiceInput(service()); expect(result.title).toBe("Interface web"); expect(result.bullet_points).toEqual(["React", "Accessibilité"]); expect(result.published).toBe(false); });
  it.each([{ published: "false" }, { icon: "arbitrary" }, { accent: "red" }, { display_order: -1 }, { display_order: 1.5 }, { bullet_points: [] }, { title: "x" }])("rejects invalid service fields: %j", (fields) => expect(() => validateServiceInput({ ...service(), ...fields })).toThrow());
  it("normalizes month inputs without depending on the browser time zone", () => { const result = validateJourneyInput(journey()); expect(result.start_date).toBe("2023-09-01"); expect(result.end_date).toBe("2025-06-01"); expect(result.tags).toEqual(["TypeScript"]); });
  it.each([{ start_date: "2023-13" }, { start_date: "2023-09-25" }, { end_date: "2020-01" }, { current: true }, { tags: Array(17).fill("React") }, { kind: "unknown" }])("rejects invalid journey fields: %j", (fields) => expect(() => validateJourneyInput({ ...journey(), ...fields })).toThrow());
  it("accepts a current entry with no end date", () => { const result = validateJourneyInput({ ...journey(), current: true, end_date: null }); expect(result.current).toBe(true); expect(result.end_date).toBeNull(); });
  it.each(["blob:temporary", "javascript:alert(1)", "http://unsafe.test", "https://user:password@example.com"])("rejects unsafe logo and external URLs: %s", (url) => { expect(() => validateJourneyInput({ ...journey(), logo_url: url })).toThrow(); expect(() => validateJourneyInput({ ...journey(), external_url: url })).toThrow(); });
  it("accepts HTTPS logos and existing local assets", () => { expect(validateJourneyInput({ ...journey(), logo_url: "/assets/PP.webp" }).logo_url).toBe("/assets/PP.webp"); expect(validateJourneyInput({ ...journey(), logo_url: "https://storage.test/logo.png" }).logo_url).toBe("https://storage.test/logo.png"); });
  it("allows a project link only for a project entry with a valid UUID", () => { const project_id = "11111111-1111-4111-8111-111111111111"; expect(() => validateJourneyInput({ ...journey(), project_id })).toThrow(); expect(() => validateJourneyInput({ ...journey(), kind: "project", project_id: "invalid" })).toThrow(); expect(validateJourneyInput({ ...journey(), kind: "project", project_id }).project_id).toBe(project_id); });
});
describe("journey and marquee selection", () => {
  it("prioritizes manual order, then reverse chronology, without mutating entries", () => {
    const entries = [{ ...validateJourneyInput(journey()), id: "older", created_at: "", updated_at: "" }, { ...validateJourneyInput({ ...journey(), start_date: "2024-09", end_date: null }), id: "newer", created_at: "", updated_at: "" }, { ...validateJourneyInput({ ...journey(), display_order: 1 }), id: "last", created_at: "", updated_at: "" }] as JourneyEntry[];
    expect(sortJourney(entries).map((entry) => entry.id)).toEqual(["newer", "older", "last"]); expect(entries[0].id).toBe("older");
  });
  it("formats a finished period and a current period in French", () => { expect(formatJourneyPeriod({ start_date: "2023-09-01", end_date: "2025-06-01", current: false })).toBe("sept. 2023 — juin 2025"); expect(formatJourneyPeriod({ start_date: "2023-09-01", end_date: null, current: true })).toBe("sept. 2023 — Présent"); });
  it("supports existing technology rows and honors visibility and manual order", () => { const tech = (id: number, fields = {}): TechStack => ({ id, name: `Tech ${id}`, logo_url: "", created_at: "2026-01-01", ...fields }); const items = [tech(1, { hero_order: 4 }), tech(2, { hero_visible: false }), tech(3)]; expect(selectHeroTechnologies(items).map((item) => item.id)).toEqual([3, 1]); expect(items[0].id).toBe(1); });
});
