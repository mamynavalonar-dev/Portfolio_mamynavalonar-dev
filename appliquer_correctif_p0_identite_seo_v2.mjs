import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(root, "correctif_backups", `p0-identite-v2-${timestamp}`);

const files = {
  layout: path.join(root, "src", "app", "layout.tsx"),
  contact: path.join(root, "src", "components", "sections", "contact", "ContactForm.tsx"),
  about: path.join(root, "src", "components", "sections", "About.tsx"),
  hero: path.join(root, "src", "components", "sections", "Hero.tsx"),
};

function stop(message) {
  console.error(`\nERREUR : ${message}`);
  console.error("Aucun fichier n'a été modifié.");
  process.exit(1);
}

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    stop(`fichier introuvable (${name}) : ${path.relative(root, file)}`);
  }
}

const original = Object.fromEntries(
  Object.entries(files).map(([name, file]) => [name, fs.readFileSync(file, "utf8")])
);

const changed = { ...original };
const notes = [];

/* =========================================================
   1) LAYOUT / SEO
   ========================================================= */

if (!changed.layout.includes("export default function RootLayout")) {
  stop("structure inattendue dans src/app/layout.tsx (RootLayout introuvable)");
}

if (!changed.layout.includes('import type { Metadata } from "next";')) {
  changed.layout = `import type { Metadata } from "next";\n${changed.layout}`;
  notes.push("layout.tsx : import Metadata ajouté");
}

const metadataBlock = `export const metadata: Metadata = {
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
};`;

const metadataRegex =
  /export const metadata(?:\s*:\s*Metadata)?\s*=\s*\{[\s\S]*?\n\};(?=\s*\n\s*export default function RootLayout)/;

if (metadataRegex.test(changed.layout)) {
  const before = changed.layout;
  changed.layout = changed.layout.replace(metadataRegex, metadataBlock);
  if (changed.layout !== before) {
    notes.push("layout.tsx : metadata/SEO harmonisés");
  }
} else if (!changed.layout.includes(metadataBlock)) {
  stop("bloc metadata non reconnu dans src/app/layout.tsx");
}

/* =========================================================
   2) CONTACT / RÉSEAUX
   ========================================================= */

const desiredLinkedIn =
  "https://www.linkedin.com/in/mamy-navalona-antonio-rakotoniaina-6aa98820a";
const desiredInstagram = "https://www.instagram.com/m1ke_tys.0n";
const desiredGitHub = "https://github.com/mamynavalonar-dev";
const desiredWhatsApp = "https://wa.me/qr/CQDLCROVEAG3O1";

const iconImportRegex =
  /import\s*\{([\s\S]*?)\}\s*from\s*["']react-icons\/fa["'];/;

const iconMatch = changed.contact.match(iconImportRegex);
if (iconMatch) {
  const icons = iconMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((name) => !["FaYoutube", "FaTiktok"].includes(name));

  for (const required of ["FaLinkedinIn", "FaInstagram", "FaGithub", "FaWhatsapp"]) {
    if (!icons.includes(required)) icons.push(required);
  }

  const replacement =
    `import {\n  ${icons.join(",\n  ")},\n} from "react-icons/fa";`;

  const before = changed.contact;
  changed.contact = changed.contact.replace(iconImportRegex, replacement);
  if (changed.contact !== before) {
    notes.push("ContactForm.tsx : imports réseaux nettoyés");
  }
} else {
  stop("import react-icons/fa non reconnu dans ContactForm.tsx");
}

const socialLinksRegex =
  /const socialLinks\s*=\s*\[[\s\S]*?\n\];(?=\s*\n\s*export default function ContactForm)/;

const desiredSocialLinks = `const socialLinks = [
  {
    title: "Instagram",
    user: "@m1ke_tys.0n",
    icon: FaInstagram,
    link: "${desiredInstagram}",
  },
  {
    title: "GitHub",
    user: "@mamynavalonar-dev",
    icon: FaGithub,
    link: "${desiredGitHub}",
  },
  {
    title: "WhatsApp",
    user: "Me contacter",
    icon: FaWhatsapp,
    link: "${desiredWhatsApp}",
  },
];`;

if (socialLinksRegex.test(changed.contact)) {
  const before = changed.contact;
  changed.contact = changed.contact.replace(socialLinksRegex, desiredSocialLinks);
  if (changed.contact !== before) {
    notes.push("ContactForm.tsx : Instagram/GitHub/WhatsApp corrigés");
  }
} else if (!changed.contact.includes(desiredWhatsApp)) {
  stop("bloc socialLinks non reconnu dans ContactForm.tsx");
}

const linkedinHrefRegex =
  /href=["']https:\/\/(?:www\.)?linkedin\.com\/in\/[^"']+["']/g;

if (linkedinHrefRegex.test(changed.contact)) {
  changed.contact = changed.contact.replace(
    linkedinHrefRegex,
    `href="${desiredLinkedIn}"`
  );
  notes.push("ContactForm.tsx : LinkedIn corrigé");
}

changed.contact = changed.contact.replace(
  /<p className="text-xs text-white\/35">@linkedin<\/p>/g,
  '<p className="text-xs text-white/35">Mamy Navalona Antonio</p>'
);

/* =========================================================
   3) À PROPOS
   ========================================================= */

const oldAboutRegex =
  /Jeune diplômé d&apos;un lycée professionnel en génie logiciel[\s\S]*?expérience numérique optimale\./;

const newAboutText = `Développeur Full Stack junior passionné par la création
              d&apos;applications web modernes, fiables et responsives. Je
              développe des interfaces soignées et des fonctionnalités complètes
              en accordant une attention particulière à la qualité du code, à
              l&apos;expérience utilisateur et aux données.`;

if (oldAboutRegex.test(changed.about)) {
  changed.about = changed.about.replace(oldAboutRegex, newAboutText);
  notes.push("About.tsx : présentation professionnelle corrigée");
} else if (changed.about.includes("lycée professionnel")) {
  stop("mention 'lycée professionnel' détectée mais paragraphe non reconnu dans About.tsx");
}

/* =========================================================
   4) HERO
   ========================================================= */

if (changed.hero.includes("Disponible pour travailler")) {
  changed.hero = changed.hero.replace(
    "Disponible pour travailler",
    "RAKOTONIAINA Mamy Navalona Antonio"
  );
  notes.push("Hero.tsx : identité affichée dans le label");
}

const oldHeroArray = `"Programmeur Junior",
                "Développeur Web junior",
                "Jeune diplômé",
                "Bon code !",`;

const newHeroArray = `"Développeur Full Stack junior",
                "Développeur Web",
                "React • Next.js • TypeScript",
                "Ouvert aux opportunités",`;

if (changed.hero.includes(oldHeroArray)) {
  changed.hero = changed.hero.replace(oldHeroArray, newHeroArray);
  notes.push("Hero.tsx : textes rotatifs harmonisés");
}

/* =========================================================
   CONTRÔLES FINAUX
   ========================================================= */

const forbidden = [
  ["layout.tsx", changed.layout, "Rifqi Muhammad Aliya"],
  ["ContactForm.tsx", changed.contact, "rifqimuhammadaliya"],
  ["ContactForm.tsx", changed.contact, "itsmeikky_12"],
  ["ContactForm.tsx", changed.contact, "zettaajah"],
  ["ContactForm.tsx", changed.contact, "itsme.ikky_"],
  ["About.tsx", changed.about, "lycée professionnel"],
];

const remaining = forbidden.filter(([, content, needle]) =>
  content.toLowerCase().includes(needle.toLowerCase())
);

if (remaining.length) {
  stop(
    "des traces du template restent présentes : " +
      remaining.map(([file, , needle]) => `${file} -> ${needle}`).join(", ")
  );
}

const expected = [
  ["layout.tsx", changed.layout, "RAKOTONIAINA Mamy Navalona Antonio"],
  ["ContactForm.tsx", changed.contact, desiredLinkedIn],
  ["ContactForm.tsx", changed.contact, desiredInstagram],
  ["ContactForm.tsx", changed.contact, desiredGitHub],
  ["ContactForm.tsx", changed.contact, desiredWhatsApp],
];

for (const [file, content, needle] of expected) {
  if (!content.includes(needle)) {
    stop(`contrôle final échoué : ${needle} absent de ${file}`);
  }
}

const modifiedNames = Object.keys(files).filter(
  (name) => changed[name] !== original[name]
);

if (modifiedNames.length === 0) {
  console.log("\nP0 — Identité / SEO : rien à modifier.");
  console.log("Les fichiers ciblés semblent déjà conformes.");
  console.log("\nÉtapes suivantes :");
  console.log("1. pnpm build");
  console.log("2. pnpm lint");
  process.exit(0);
}

/* =========================================================
   SAUVEGARDE + ÉCRITURE
   ========================================================= */

fs.mkdirSync(backupDir, { recursive: true });

for (const name of modifiedNames) {
  const file = files[name];
  const relative = path.relative(root, file);
  const backupFile = path.join(backupDir, relative);
  fs.mkdirSync(path.dirname(backupFile), { recursive: true });
  fs.writeFileSync(backupFile, original[name], "utf8");
}

for (const name of modifiedNames) {
  fs.writeFileSync(files[name], changed[name], "utf8");
}

console.log("\nCorrectif P0 — Identité / SEO V2 appliqué avec succès.");
console.log(`Sauvegarde : ${path.relative(root, backupDir)}`);

console.log("\nFichiers modifiés :");
for (const name of modifiedNames) {
  console.log(`- ${path.relative(root, files[name])}`);
}

console.log("\nActions :");
for (const note of notes) {
  console.log(`- ${note}`);
}

console.log("\nContrôles finaux : OK");
console.log("- aucune trace Rifqi détectée dans les fichiers ciblés");
console.log("- anciens réseaux du template supprimés");
console.log("- LinkedIn, Instagram, GitHub et WhatsApp présents");
console.log("- identité/SEO harmonisés");

console.log("\nÉtapes suivantes :");
console.log("1. pnpm build");
console.log("2. pnpm lint");
