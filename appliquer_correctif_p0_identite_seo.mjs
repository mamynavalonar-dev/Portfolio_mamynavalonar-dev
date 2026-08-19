import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(root, "correctif_backups", `p0-identite-${timestamp}`);

const files = {
  layout: path.join(root, "src", "app", "layout.tsx"),
  contact: path.join(root, "src", "components", "sections", "contact", "ContactForm.tsx"),
  about: path.join(root, "src", "components", "sections", "About.tsx"),
  hero: path.join(root, "src", "components", "sections", "Hero.tsx"),
};

function fail(message) {
  console.error(`\nERREUR : ${message}`);
  console.error("Aucun fichier n'a été modifié.");
  process.exit(1);
}

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    fail(`fichier introuvable (${name}) : ${path.relative(root, file)}`);
  }
}

const original = Object.fromEntries(
  Object.entries(files).map(([name, file]) => [name, fs.readFileSync(file, "utf8")])
);

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`point de contrôle introuvable : ${label}`);
  }
}

requireText(original.layout, 'title: "Rifqi Muhammad Aliya"', "ancienne metadata Rifqi");
requireText(original.contact, "https://www.linkedin.com/in/rifqimuhammadaliya/", "ancien LinkedIn");
requireText(original.contact, "FaYoutube", "ancien import YouTube");
requireText(original.contact, "FaTiktok", "ancien import TikTok");
requireText(
  original.about,
  "Jeune diplômé d&apos;un lycée professionnel en génie logiciel",
  "ancienne présentation À propos"
);
requireText(original.hero, "Disponible pour travailler", "ancien label Hero");
requireText(original.hero, '"Programmeur Junior"', "ancien texte rotatif Hero");

const newLayout = `import type { Metadata } from "next";
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
`;

let newContact = original.contact;

newContact = newContact.replace(
`  FaLinkedinIn,
  FaInstagram,
  FaGithub,
  FaYoutube,
  FaTiktok,`,
`  FaLinkedinIn,
  FaInstagram,
  FaGithub,
  FaWhatsapp,`
);

const oldSocialLinks = `const socialLinks = [
  {
    title: "Instagram",
    user: "@instagram",
    icon: FaInstagram,
    link: "https://www.instagram.com/itsmeikky_12?igsh=ZHFpMTJ1bHQzeDAx",
  },
  {
    title: "Youtube",
    user: "@youtube",
    icon: FaYoutube,
    link: "https://youtube.com/@zettaajah?si=QRjJGD4zCQG8aIHX",
  },
  {
    title: "Github",
    user: "@github",
    icon: FaGithub,
    link: "https://github.com/mamynavalonar-dev",
  },
  {
    title: "TikTok",
    user: "@tiktok",
    icon: FaTiktok,
    link: "https://www.tiktok.com/@itsme.ikky_?_r=1&_t=ZS-95yAYr5PHUb",
  },
];`;

const newSocialLinks = `const socialLinks = [
  {
    title: "Instagram",
    user: "@m1ke_tys.0n",
    icon: FaInstagram,
    link: "https://www.instagram.com/m1ke_tys.0n",
  },
  {
    title: "GitHub",
    user: "@mamynavalonar-dev",
    icon: FaGithub,
    link: "https://github.com/mamynavalonar-dev",
  },
  {
    title: "WhatsApp",
    user: "Me contacter",
    icon: FaWhatsapp,
    link: "https://wa.me/qr/CQDLCROVEAG3O1",
  },
];`;

requireText(newContact, oldSocialLinks, "bloc des anciens réseaux sociaux");
newContact = newContact.replace(oldSocialLinks, newSocialLinks);

newContact = newContact
  .replace(
    'href="https://www.linkedin.com/in/rifqimuhammadaliya/"',
    'href="https://www.linkedin.com/in/mamy-navalona-antonio-rakotoniaina-6aa98820a"'
  )
  .replace(
    '<p className="text-xs text-white/35">@linkedin</p>',
    '<p className="text-xs text-white/35">Mamy Navalona Antonio</p>'
  );

let newAbout = original.about;
newAbout = newAbout.replace(
`              Jeune diplômé d&apos;un lycée professionnel en génie logiciel
              (promotion 2026), passionné par le développement frontend et les
              interfaces modernes. Je me concentre sur la création de sites web
              propres, responsives et visuellement percutants pour offrir une
              expérience numérique optimale.`,
`              Développeur Full Stack junior passionné par la création
              d&apos;applications web modernes, fiables et responsives. Je
              développe des interfaces soignées et des fonctionnalités complètes
              en accordant une attention particulière à la qualité du code, à
              l&apos;expérience utilisateur et aux données.`
);

let newHero = original.hero;
newHero = newHero
  .replace(
    "            Disponible pour travailler",
    "            RAKOTONIAINA Mamy Navalona Antonio"
  )
  .replace(
`                "Programmeur Junior",
                "Développeur Web junior",
                "Jeune diplômé",
                "Bon code !",`,
`                "Développeur Full Stack junior",
                "Développeur Web",
                "React • Next.js • TypeScript",
                "Ouvert aux opportunités",`
  );

const changed = {
  layout: newLayout,
  contact: newContact,
  about: newAbout,
  hero: newHero,
};

for (const key of Object.keys(changed)) {
  if (changed[key] === original[key]) {
    fail(`aucune modification détectée pour ${key}`);
  }
}

fs.mkdirSync(backupDir, { recursive: true });

for (const [name, file] of Object.entries(files)) {
  const relative = path.relative(root, file);
  const backupFile = path.join(backupDir, relative);
  fs.mkdirSync(path.dirname(backupFile), { recursive: true });
  fs.writeFileSync(backupFile, original[name], "utf8");
}

for (const [name, file] of Object.entries(files)) {
  fs.writeFileSync(file, changed[name], "utf8");
}

console.log("\nCorrectif P0 — Identité / SEO appliqué avec succès.");
console.log(`Sauvegarde : ${path.relative(root, backupDir)}`);
console.log("\nFichiers modifiés :");
for (const file of Object.values(files)) {
  console.log(`- ${path.relative(root, file)}`);
}
console.log("\nCorrections effectuées :");
console.log("- suppression de l'identité Rifqi dans les metadata et LinkedIn");
console.log("- metadata SEO remplacées par l'identité RAKOTONIAINA Mamy Navalona Antonio");
console.log("- LinkedIn, Instagram, GitHub et WhatsApp corrigés");
console.log("- anciens comptes YouTube/TikTok du template supprimés");
console.log("- présentation À propos corrigée sans mention de lycée professionnel");
console.log("- identité affichée dès le Hero et textes rotatifs harmonisés");
console.log("\nÉtapes suivantes :");
console.log("1. pnpm build");
console.log("2. pnpm lint");
console.log("3. vérifier visuellement Accueil / À propos / Contact");
