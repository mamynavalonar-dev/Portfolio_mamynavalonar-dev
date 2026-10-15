import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ responses: {} as Record<string, {data: unknown; error: unknown} | Promise<unknown>>, select: vi.fn(), signal: vi.fn(), cacheArgs: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (callback: (...args: unknown[]) => unknown) => (...args: unknown[]) => { m.cacheArgs(args); return callback(...args); } }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: (table: string) => {
  const builder = {
    select: (columns: string) => { m.select(table, columns); return builder; },
    order: () => builder, eq: () => builder, limit: () => builder,
    abortSignal: (signal: AbortSignal) => { m.signal(signal); return builder; },
    maybeSingle: () => Promise.resolve(m.responses[table]),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(m.responses[table]).then(resolve, reject),
  };
  return builder;
} }) }));
vi.mock("@/app/HomeClient", () => ({ default: () => null }));
import { fetchPublicPortfolio, fetchPublicProject } from "@/lib/publicPortfolio";
import Home from "@/app/page";
import sitemap from "@/app/sitemap";
const id = "11111111-1111-4111-8111-111111111111";
const project = { id, title: "Projet", description: "Description", technologies: "React, Next.js", key_features: "Galerie", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-10-13T00:00:00Z" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PORTFOLIO_OFFLINE_BUILD", "false");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://storage.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.responses = { projects: { data: [project], error: null }, certificates: { data: [], error: null }, tech_stack: { data: [], error: null }, portfolio_services: { data: [], error: null }, portfolio_journey: { data: [], error: null }, portfolio_social_settings: { data: { heading: "Mes réseaux", introduction: "" }, error: null }, portfolio_social_links: { data: [], error: null } };
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("public portfolio reliability", () => {
  it("keeps the public key and URL out of framework cache arguments", async () => { await fetchPublicPortfolio(); const args = JSON.stringify(m.cacheArgs.mock.calls); expect(args).not.toContain("public-test-key"); expect(args).not.toContain("https://storage.test"); expect(m.cacheArgs.mock.calls).toHaveLength(6); });
  it("isolates cached content when the provider configuration changes", async () => { await fetchPublicPortfolio(); const first = m.cacheArgs.mock.calls[0][0]; vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "other-public-key"); m.cacheArgs.mockClear(); await fetchPublicPortfolio(); expect(m.cacheArgs.mock.calls[0][0]).not.toEqual(first); });
  it("logs a bounded provider cause while retaining failed-page regeneration", async () => { m.responses.projects = { data: null, error: { message: "TimeoutError: signal timed out public-test-key" } }; await expect(Home()).rejects.toThrow("actualisé"); const log = JSON.stringify(vi.mocked(console.error).mock.calls); expect(log).toContain("TIMEOUT"); expect(log).not.toContain("public-test-key"); });
  it("does not mistake a simultaneous schema absence and network outage for a missing migration", async () => { m.responses.portfolio_social_settings = { data: null, error: { code: "42P01" } }; m.responses.portfolio_social_links = { data: null, error: { message: "fetch failed" } }; const result = await fetchPublicPortfolio(); expect(result.contentMigrationMissing).toBeUndefined(); await expect(Home()).rejects.toThrow("actualisé"); });
  it("reads social configuration without restoring deleted default links", async () => { const result = await fetchPublicPortfolio(); expect(result.social?.settings.heading).toBe("Mes réseaux"); expect(result.social?.links).toEqual([]); });
  it("keeps existing social links as a fallback only while the new migration is missing", async () => { m.responses.portfolio_social_settings = { data: null, error: { code: "42P01" } }; m.responses.portfolio_social_links = { data: null, error: { code: "42P01" } }; const result = await fetchPublicPortfolio(); expect(result.social).toBeUndefined(); expect(result.contentMigrationMissing).toBe(true); await expect(Home()).resolves.toBeDefined(); });
  it("refuses incomplete regeneration after a social read outage", async () => { m.responses.portfolio_social_links = { data: null, error: { code: "XX000" } }; await expect(Home()).rejects.toThrow("actualisé"); });
  it("keeps the existing page available while the additive content migration is absent", async () => {
    m.responses.portfolio_services = { data: null, error: { code: "42P01" } }; m.responses.portfolio_journey = { data: null, error: { code: "42P01" } };
    const result = await fetchPublicPortfolio(); expect(result.projects).toHaveLength(1); expect(result.unavailable).toBeUndefined(); expect(result.contentUnavailable).toEqual(["services", "journey"]);
    await expect(Home()).resolves.toBeDefined();
  });
  it("loads published new content alongside existing collections", async () => {
    m.responses.portfolio_services = { data: [{ id: "service", published: true }], error: null };
    const result = await fetchPublicPortfolio(); expect(result.services).toHaveLength(1); expect(result.contentUnavailable).toBeUndefined();
  });
  it("preserves an existing cached page when a migrated content table becomes unavailable", async () => {
    m.responses.portfolio_services = { data: null, error: { code: "XX000" } };
    const result = await fetchPublicPortfolio(); expect(result.contentMigrationMissing).toBeUndefined();
    await expect(Home()).rejects.toThrow("actualisé");
  });
  it("distinguishes a successful empty collection from an unavailable one", async () => {
    const result = await fetchPublicPortfolio();
    expect(result.unavailable).toBeUndefined(); expect(result.certificates).toEqual([]);
    expect(result.projects[0].technologies).toEqual(["React", "Next.js"]);
  });
  it("retains other collections when a read fails", async () => {
    m.responses.certificates = { data: null, error: { message: "unavailable" } };
    const result = await fetchPublicPortfolio();
    expect(result.projects).toHaveLength(1); expect(result.unavailable).toEqual(["certificates"]);
  });
  it("rejects incomplete page regeneration rather than returning an empty replacement", async () => {
    m.responses.projects = { data: null, error: { message: "unavailable" } };
    await expect(Home()).rejects.toThrow("actualisé");
  });
  it("does not call the network for an offline build or invalid project ID", async () => {
    expect(await fetchPublicProject("invalid")).toBeNull();
    vi.stubEnv("PORTFOLIO_OFFLINE_BUILD", "true");
    expect((await fetchPublicPortfolio()).projects).toEqual([]); expect(m.select).not.toHaveBeenCalled();
  });
  it("propagates detail read failures rather than producing a false 404", async () => {
    m.responses.projects = { data: null, error: { message: "unavailable" } };
    await expect(fetchPublicProject(id)).rejects.toThrow("chargé");
  });
  it("returns null only for a genuinely missing project", async () => {
    m.responses.projects = { data: null, error: null };
    expect(await fetchPublicProject(id)).toBeNull();
  });
  it("attaches bounded cancellation to each public database read", async () => {
    await fetchPublicPortfolio(); expect(m.signal).toHaveBeenCalledTimes(7);
    for (const [signal] of m.signal.mock.calls) expect(signal).toBeInstanceOf(AbortSignal);
  });
  it("uses the stored modification date in the sitemap", async () => {
    const entries = await sitemap();
    expect(entries[0].lastModified).toBeUndefined();
    expect(entries[1].lastModified).toEqual(new Date(project.updated_at));
  });
  it("does not regenerate a sitemap with missing projects", async () => {
    m.responses.projects = { data: null, error: { message: "unavailable" } };
    await expect(sitemap()).rejects.toThrow("actualisé");
  });
});
