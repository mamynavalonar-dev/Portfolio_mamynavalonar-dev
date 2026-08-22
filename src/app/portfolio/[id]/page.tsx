import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectDetailClient from "@/app/portfolio/[id]/ProjectDetailClient";
import { fetchPublicProject } from "@/lib/publicPortfolio";

export const revalidate = 300;

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await fetchPublicProject(id);

  if (!project) return { title: "Projet introuvable", robots: { index: false } };

  const description = project.description.slice(0, 160);

  return {
    title: project.title,
    description,
    alternates: { canonical: `/portfolio/${project.id}` },
    openGraph: {
      type: "article",
      title: project.title,
      description,
      url: `/portfolio/${project.id}`,
      images: project.image_url ? [{ url: project.image_url }] : undefined,
    },
  };
}

export default async function PortfolioDetailPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = await fetchPublicProject(id);

  if (!project) notFound();
  return <ProjectDetailClient initialProject={project} />;
}
