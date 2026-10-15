import { ArrowUpRight, Globe, Mail } from "lucide-react";
import { FaFacebookF, FaGithub, FaInstagram, FaLinkedinIn, FaTelegramPlane, FaWhatsapp, FaYoutube } from "react-icons/fa";
import { FaTiktok, FaXTwitter } from "react-icons/fa6";
import type { SocialContent } from "@/types";
import styles from "./SocialLinks.module.css";
const icons = { linkedin: FaLinkedinIn, instagram: FaInstagram, github: FaGithub, whatsapp: FaWhatsapp, facebook: FaFacebookF, x: FaXTwitter, telegram: FaTelegramPlane, youtube: FaYoutube, tiktok: FaTiktok, email: Mail, website: Globe, other: Globe };

export default function SocialLinks({ content }: { content: SocialContent }) {
  const links = content.links.filter((link) => link.published).sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id));
  if (!links.length) return null;
  return <div className={`${styles.container} mt-5 border-t border-white/10 pt-4`}>
    <h3 className="mb-3 text-sm text-white/70">{content.settings.heading}</h3>
    {content.settings.introduction && <p className="mb-4 whitespace-pre-line break-words text-sm leading-relaxed text-white/65">{content.settings.introduction}</p>}
    <nav aria-label="Mes réseaux sociaux" className={styles.links}>
      {links.map((link) => {
        const Icon = icons[link.platform] ?? Globe;
        return <a key={link.id} href={link.url} {...(link.platform !== "email" ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`group relative flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${link.featured ? styles.featured : ""}`}>
          <span className="flex min-w-0 items-center gap-2.5"><Icon size={16} aria-hidden="true" className="shrink-0" /><span className="min-w-0"><span className="block truncate text-[13px] font-medium leading-5" title={link.title}>{link.title}</span>{link.display_name && <span className="block truncate text-xs leading-5 text-white/60" title={link.display_name}>{link.display_name}</span>}</span></span>
          <ArrowUpRight size={14} aria-hidden="true" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </a>;
      })}
    </nav>
  </div>;
}
