import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mamynavalona-dev.vercel.app",
);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "RAKOTONIAINA Mamy Navalona Antonio | Développeur Full Stack",
    template: "%s | Mamy Navalona Antonio",
  },
  description:
    "Portfolio de RAKOTONIAINA Mamy Navalona Antonio, développeur Full Stack junior. Découvrez mes projets web, mes compétences, mes certifications et mes coordonnées.",
  keywords: [
    "RAKOTONIAINA Mamy Navalona Antonio",
    "Mamy Navalona Antonio",
    "mamynavalonar-dev",
    "développeur Full Stack",
    "développeur web",
    "Next.js",
    "React",
    "TypeScript",
    "Supabase",
    "PostgreSQL",
    "portfolio développeur",
  ],
  authors: [{ name: "RAKOTONIAINA Mamy Navalona Antonio" }],
  creator: "RAKOTONIAINA Mamy Navalona Antonio",
  publisher: "RAKOTONIAINA Mamy Navalona Antonio",
  category: "technology",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Portfolio de Mamy Navalona Antonio",
    locale: "fr_FR",
    title: "RAKOTONIAINA Mamy Navalona Antonio | Développeur Full Stack",
    description:
      "Découvrez le portfolio, les projets, les compétences et les certifications de RAKOTONIAINA Mamy Navalona Antonio.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Portfolio de RAKOTONIAINA Mamy Navalona Antonio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RAKOTONIAINA Mamy Navalona Antonio | Développeur Full Stack",
    description:
      "Projets, compétences et certifications d'un développeur Full Stack junior.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="preload"
          href="/assets/kartu.glb"
          as="fetch"
          crossOrigin="anonymous"
          media="(min-width: 768px)"
        />
        <link
          rel="preload"
          href="/assets/bandd.png"
          as="image"
          media="(min-width: 768px)"
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only fixed left-4 top-4 z-[10000] rounded-lg bg-white px-4 py-3 text-black focus:not-sr-only"
        >
          Aller au contenu principal
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
