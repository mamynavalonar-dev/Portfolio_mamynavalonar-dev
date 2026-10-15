import type { MetadataRoute } from "next";
import { fetchPublicPortfolio } from "@/lib/publicPortfolio";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio-mamynavalonar-dev.vercel.app";
  const portfolio = await fetchPublicPortfolio();
  if (portfolio.unavailable?.includes("projects")) {
    throw new Error("Le sitemap ne peut pas être actualisé pour le moment.");
  }

  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...portfolio.projects.map((project) => ({
      url: `${baseUrl}/portfolio/${project.id}`,
      lastModified: new Date(project.updated_at || project.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
