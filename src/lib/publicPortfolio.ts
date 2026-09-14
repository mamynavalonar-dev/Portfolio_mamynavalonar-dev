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
const collectionNames = ["projects", "certificates", "techStacks"] as const;

export async function fetchPublicPortfolio(): Promise<PublicPortfolioData> {
  if (process.env.PORTFOLIO_OFFLINE_BUILD === "true") return emptyPortfolio;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return { ...emptyPortfolio, unavailable: [...collectionNames] };

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const results = await Promise.allSettled([
      supabase.from("projects").select("*").order("created_at", { ascending: true }),
      supabase.from("certificates").select("*").order("created_at", { ascending: true }),
      supabase.from("tech_stack").select("*").order("created_at", { ascending: true }),
    ]);

    const unavailable = collectionNames.filter((_, index) => {
      const result = results[index];
      return result.status === "rejected" || Boolean(result.value.error);
    });
    if (unavailable.length) console.error("Public portfolio collections unavailable:", unavailable.join(", "));
    const [projectsResult, certificatesResult, techResult] = results;

    return {
      projects: (projectsResult.status === "fulfilled" && !projectsResult.value.error ? projectsResult.value.data ?? [] : []).map((project) =>
        normalizeProject(project),
      ),
      certificates: certificatesResult.status === "fulfilled" && !certificatesResult.value.error ? certificatesResult.value.data ?? [] : [],
      techStacks: techResult.status === "fulfilled" && !techResult.value.error ? techResult.value.data ?? [] : [],
      ...(unavailable.length ? { unavailable } : {}),
    };
  } catch (error) {
    console.error("Public portfolio server fetch error:", error);
    return { ...emptyPortfolio, unavailable: [...collectionNames] };
  }
}

export const fetchPublicProject = cache(async (id: string) => {
  if (process.env.PORTFOLIO_OFFLINE_BUILD === "true") return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Le service des projets est temporairement indisponible.");

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Le projet ne peut pas être chargé pour le moment.");
  if (!data) return null;
  return normalizeProject(data);
});
