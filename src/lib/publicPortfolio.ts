import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { describePublicReadError } from "@/lib/publicReadError";
import { normalizeProject } from "@/lib/projectFields";
import { PROJECT_PUBLIC_COLUMNS, CERTIFICATE_PUBLIC_COLUMNS, TECH_PUBLIC_COLUMNS } from "@/lib/publicFields";
import { SERVICE_PUBLIC_COLUMNS, JOURNEY_PUBLIC_COLUMNS, SOCIAL_PUBLIC_COLUMNS } from "@/lib/portfolioContentFields";
import { DEFAULT_SOCIAL_CONTENT } from "@/lib/socialDefaults";
import type { PublicPortfolioData, Certificate, TechStack, PortfolioService, JourneyEntry, SocialContent, SocialLink } from "@/types";

const emptyPortfolio: PublicPortfolioData = { projects: [], certificates: [], techStacks: [], services: [], journey: [] };
const collectionNames = ["projects", "certificates", "techStacks"] as const;
const collections = {
  projects: { table: "projects", columns: PROJECT_PUBLIC_COLUMNS },
  certificates: { table: "certificates", columns: CERTIFICATE_PUBLIC_COLUMNS },
  techStacks: { table: "tech_stack", columns: TECH_PUBLIC_COLUMNS },
};

function publicConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey, scope: createHash("sha256").update(url).update("\0").update(anonKey).digest("hex") };
}

function publicClient(scope: string) {
  const config = publicConfiguration();
  if (!config || scope !== config.scope) throw new Error("Configuration publique indisponible ou modifiée.");
  const { url, anonKey } = config;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

class PublicContentReadError extends Error {
  readonly missingMigration: boolean;
  constructor(name: string, error: unknown) {
    const issue = describePublicReadError(error, [process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""]);
    super(`Lecture publique indisponible : ${name} [${issue.category}/${issue.code}] ${issue.message}`);
    this.missingMigration = issue.missingMigration;
  }
}

const readCollection = unstable_cache(
  async (name: (typeof collectionNames)[number], scope: string) => {
    const { table, columns } = collections[name];
    const client = publicClient(scope);
    let { data, error } = await client.from(table).select<string, Record<string, unknown>>(name === "techStacks" ? "id,name,logo_url,created_at,hero_visible,hero_order" : columns)
      .order("created_at", { ascending: true }).abortSignal(AbortSignal.timeout(6000));
    if (name === "techStacks" && error?.code === "42703" && /hero_visible|hero_order/.test(error.message)) {
      const legacy = await client.from(table).select<string, Record<string, unknown>>(columns).order("created_at", { ascending: true }).abortSignal(AbortSignal.timeout(6000));
      data = legacy.data; error = legacy.error;
    }
    if (error) throw new PublicContentReadError(name, error);
    return (data ?? []) as unknown as Record<string, unknown>[];
  },
  ["public-portfolio-collections-v4"],
  { revalidate: 300, tags: ["public-portfolio"] },
);

const contentNames = ["services", "journey", "social"] as const;
const readContent = unstable_cache(
  async (name: "services" | "journey", scope: string) => {
    const { data, error } = await publicClient(scope)
      .from(name === "services" ? "portfolio_services" : "portfolio_journey")
      .select<string, Record<string, unknown>>(name === "services" ? SERVICE_PUBLIC_COLUMNS : JOURNEY_PUBLIC_COLUMNS)
      .eq("published", true).order("display_order", { ascending: true })
      .order("created_at", { ascending: true }).limit(250)
      .abortSignal(AbortSignal.timeout(6000));
    if (error) throw new PublicContentReadError(name, error);
    return data ?? [];
  },
  ["public-portfolio-content-v2"],
  { revalidate: 300, tags: ["public-portfolio"] },
);

const readSocial = unstable_cache(async (scope: string): Promise<SocialContent> => {
  const client = publicClient(scope);
  const [settings, links] = await Promise.all([
    client.from("portfolio_social_settings").select("heading,introduction").eq("id", 1).abortSignal(AbortSignal.timeout(6000)).maybeSingle(),
    client.from("portfolio_social_links").select(SOCIAL_PUBLIC_COLUMNS).eq("published", true).order("display_order", { ascending: true }).order("created_at", { ascending: true }).limit(250).abortSignal(AbortSignal.timeout(6000)),
  ]);
  const errors = [settings.error, links.error].filter((error) => error !== null && error !== undefined);
  const error = errors.find((item) => !describePublicReadError(item).missingMigration) ?? errors[0];
  if (error) throw new PublicContentReadError("social", error);
  return { settings: settings.data ?? DEFAULT_SOCIAL_CONTENT.settings, links: (links.data ?? []) as SocialLink[] };
}, ["public-portfolio-social-v2"], { revalidate: 300, tags: ["public-portfolio"] });

export async function fetchPublicPortfolio(): Promise<PublicPortfolioData> {
  if (process.env.PORTFOLIO_OFFLINE_BUILD === "true") return emptyPortfolio;
  const config = publicConfiguration();
  if (!config) return { ...emptyPortfolio, unavailable: [...collectionNames], contentUnavailable: [...contentNames] };

  const [results, contentResults] = await Promise.all([
    Promise.allSettled(collectionNames.map((name) => readCollection(name, config.scope))),
    Promise.allSettled(contentNames.map((name) => name === "social" ? readSocial(config.scope) : readContent(name, config.scope))),
  ]);
  const contentUnavailable = contentNames.filter((_, index) => contentResults[index].status === "rejected");
  const contentMigrationMissing = contentResults.filter((result) => result.status === "rejected")
    .every((result) => result.reason instanceof PublicContentReadError && result.reason.missingMigration);
  const unavailable = collectionNames.filter((_, index) => results[index].status === "rejected");
  for (const [index, result] of [...results, ...contentResults].entries()) {
    if (result.status === "rejected") console.error("[portfolio:data]", index < collectionNames.length ? collectionNames[index] : contentNames[index - collectionNames.length], result.reason instanceof PublicContentReadError ? result.reason.message : "Lecture interrompue avant la réponse du fournisseur.");
  }
  const values = results.map((result) => result.status === "fulfilled" ? result.value : []);
  return {
    projects: values[0].map((project) => normalizeProject(project)),
    certificates: values[1] as unknown as Certificate[],
    techStacks: values[2] as unknown as TechStack[],
    services: contentResults[0].status === "fulfilled" ? contentResults[0].value as unknown as PortfolioService[] : [],
    journey: contentResults[1].status === "fulfilled" ? contentResults[1].value as unknown as JourneyEntry[] : [],
    ...(contentResults[2].status === "fulfilled" ? { social: contentResults[2].value as SocialContent } : {}),
    ...(contentUnavailable.length ? { contentUnavailable } : {}),
    ...(contentUnavailable.length && contentMigrationMissing ? { contentMigrationMissing: true } : {}),
    ...(unavailable.length ? { unavailable } : {}),
  };
}

const readProject = unstable_cache(
  async (id: string, scope: string) => {
    const { data, error } = await publicClient(scope).from("projects")
      .select(PROJECT_PUBLIC_COLUMNS).eq("id", id)
      .abortSignal(AbortSignal.timeout(6000)).maybeSingle();
    if (error) throw new PublicContentReadError("projet (chargé individuellement)", error);
    return data ? normalizeProject(data) : null;
  },
  ["public-portfolio-project-v3"],
  { revalidate: 300, tags: ["public-portfolio"] },
);

export const fetchPublicProject = cache(async (id: string) => {
  if (process.env.PORTFOLIO_OFFLINE_BUILD === "true") return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const config = publicConfiguration();
  if (!config) throw new Error("Le service des projets est temporairement indisponible.");
  return readProject(id, config.scope);
});
