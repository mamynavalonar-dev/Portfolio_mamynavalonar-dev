import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { normalizeProject } from "@/lib/projectFields";
import type { PublicPortfolioData } from "@/types";

const emptyPortfolio: PublicPortfolioData = {
  projects: [],
  certificates: [],
  techStacks: [],
};

export async function fetchPublicPortfolio(): Promise<PublicPortfolioData> {
  if (process.env.CI === "true") return emptyPortfolio;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return emptyPortfolio;

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const [projectsResult, certificatesResult, techResult] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: true }),
      supabase.from("certificates").select("*").order("created_at", { ascending: true }),
      supabase.from("tech_stack").select("*").order("created_at", { ascending: true }),
    ]);

    if (projectsResult.error || certificatesResult.error || techResult.error) {
      console.error("Public portfolio server fetch failed.");
      return emptyPortfolio;
    }

    return {
      projects: (projectsResult.data ?? []).map((project) =>
        normalizeProject(project),
      ),
      certificates: certificatesResult.data ?? [],
      techStacks: techResult.data ?? [],
    };
  } catch (error) {
    console.error("Public portfolio server fetch error:", error);
    return emptyPortfolio;
  }
}

export const fetchPublicProject = cache(async (id: string) => {
  if (process.env.CI === "true") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeProject(data);
});
