import HomeClient from "@/app/HomeClient";
import { fetchPublicPortfolio } from "@/lib/publicPortfolio";

export const revalidate = 300;

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "RAKOTONIAINA Mamy Navalona Antonio",
  url: "https://portfolio-mamynavalonar-dev.vercel.app",
  jobTitle: "Développeur Full Stack",
  sameAs: [
    "https://github.com/mamynavalonar-dev",
    "https://www.linkedin.com/in/mamy-navalona-antonio-rakotoniaina-6aa98820a",
  ],
  knowsAbout: ["Next.js", "React", "TypeScript", "Supabase", "PostgreSQL"],
};

export default async function Home() {
  const initialPortfolio = await fetchPublicPortfolio();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personSchema).replace(/</g, "\\u003c"),
        }}
      />
      <HomeClient initialPortfolio={initialPortfolio} />
    </>
  );
}
