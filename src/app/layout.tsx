import type { Metadata } from "next";
import "./globals.css";
import RefreshRedirect from "@/components/RefreshRedirect";

export const metadata: Metadata = {
  title: "RAKOTONIAINA Mamy Navalona Antonio | Développeur Full Stack",
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
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "RAKOTONIAINA Mamy Navalona Antonio | Développeur Full Stack",
    description:
      "Découvrez le portfolio, les projets, les compétences et les certifications de RAKOTONIAINA Mamy Navalona Antonio.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <RefreshRedirect />
        {children}
      </body>
    </html>
  );
}
