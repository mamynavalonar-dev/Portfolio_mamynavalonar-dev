import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: () => ({ select: () => ({ order: query }) }) } }));
import { fetchProjects, fetchCertificates, fetchTechStacks } from "@/lib/portfolioService";

describe("portfolio network failures", () => {
  beforeEach(() => query.mockReset());
  it.each([fetchProjects, fetchCertificates, fetchTechStacks])("rejects a database error instead of replacing existing content with an empty list", async (load) => {
    query.mockResolvedValue({ data: null, error: { message: "network unavailable" } });
    await expect(load()).rejects.toThrow("Impossible de charger");
  });
  it("keeps a genuinely empty collection distinct from an error", async () => {
    query.mockResolvedValue({ data: [], error: null });
    await expect(fetchProjects()).resolves.toEqual([]);
  });
  it("normalizes legacy list fields on successful reads", async () => {
    query.mockResolvedValue({ data: [{ id: "project", technologies: "React, Next.js", key_features: ["Responsive"] }], error: null });
    await expect(fetchProjects()).resolves.toMatchObject([{ technologies: ["React", "Next.js"], key_features: ["Responsive"] }]);
  });
});
