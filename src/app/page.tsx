import HomeClient from "@/app/HomeClient";
import { fetchPublicPortfolio } from "@/lib/publicPortfolio";
import { DEFAULT_SOCIAL_CONTENT } from "@/lib/socialDefaults";
import { BADGE_MODEL_URL, BADGE_TEXTURE_URL } from "@/lib/badgeAssets";

export const revalidate = 300;

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "RAKOTONIAINA Mamy Navalona Antonio",
  url: "https://portfolio-mamynavalonar-dev.vercel.app",
  jobTitle: "Développeur Full Stack",
  knowsAbout: ["Next.js", "React", "TypeScript", "Supabase", "PostgreSQL"],
};

export default async function Home() {
  const initialPortfolio = await fetchPublicPortfolio();
  // Une régénération incomplète ne doit pas remplacer une page saine en cache.
  if (initialPortfolio.unavailable?.length || (initialPortfolio.contentUnavailable?.length && !initialPortfolio.contentMigrationMissing)) {
    throw new Error("Le portfolio ne peut pas être actualisé pour le moment.");
  }
  const social = initialPortfolio.social ?? DEFAULT_SOCIAL_CONTENT;
  const profileUrls = social.links.filter((link) => link.published && !["email", "whatsapp", "website"].includes(link.platform)).map((link) => link.url);

  return (
    <>
      <link
        rel="preload"
        href={BADGE_MODEL_URL}
        as="fetch"
        crossOrigin="anonymous"
        media="(min-width: 768px) and (prefers-reduced-motion: no-preference)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        href={BADGE_TEXTURE_URL}
        as="image"
        crossOrigin="anonymous"
        media="(min-width: 768px) and (prefers-reduced-motion: no-preference)"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ ...personSchema, ...(profileUrls.length ? { sameAs: profileUrls } : {}) }).replace(/</g, "\\u003c"),
        }}
      />
      <HomeClient initialPortfolio={initialPortfolio} />
    </>
  );
}
