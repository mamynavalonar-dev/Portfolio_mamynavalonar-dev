import type { MetadataRoute } from "next";
import { fetchPublicPortfolio } from "@/lib/publicPortfolio";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://mamynavalona-dev.vercel.app";
  const portfolio = await fetchPublicPortfolio();

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...portfolio.projects.map((project) => ({
      url: `${baseUrl}/portfolio/${project.id}`,
      lastModified: new Date(project.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
