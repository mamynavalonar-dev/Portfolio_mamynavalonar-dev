"use client";

import { motion } from "framer-motion";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { ArrowRight, ArrowUpRight, Eye } from "lucide-react";

type Props = {
  title: string;
  description: string;
  index: number;
  id?: string;
  image?: string | null;
  live_url?: string | null;
  onDetailsClick?: () => void;
};

export default function PortfolioCard({
  title,
  description,
  index,
  id,
  image,
  live_url,
  onDetailsClick,
}: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50, y: 20 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-white/5 p-4 flex flex-col min-h-[300px]"
    >
      <div className="relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] mb-4">
        {image ? (
          <ResponsiveImage
            src={image}
            alt={`Aperçu du projet ${title}`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition duration-500 ease-out group-hover:scale-[1.045]"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.03]" />
        )}

        {id && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 backdrop-blur-[1px] transition-all duration-300 group-hover:bg-black/55 group-hover:opacity-100">
            <motion.button
              type="button"
              onClick={onDetailsClick}
              initial={false}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-5 py-2.5 text-[13px] font-semibold text-black shadow-[0_12px_35px_rgba(0,0,0,0.35)] transition hover:bg-white/90"
              aria-label={`Voir les détails du projet ${title}`}
            >
              <Eye size={15} />
              Voir détails
            </motion.button>
          </div>
        )}
      </div>

      <h3 className="text-[17px] font-semibold mb-2 leading-tight">{title}</h3>

      <p className="text-[13px] text-white/60 leading-relaxed line-clamp-2 min-h-[38px]">
        {description}
      </p>

      <div className="mt-auto pt-4 flex items-center justify-between gap-3">
        {live_url ? (
          <a
            href={live_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[13px] text-white/70 hover:text-white transition-all"
          >
            Démo en ligne
            <ArrowUpRight size={14} />
          </a>
        ) : (
          <div className="text-[13px] text-white/35">Aucun lien</div>
        )}

        {id && (
          <button
            type="button"
            onClick={onDetailsClick}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2 text-[13px]"
            aria-label={`Ouvrir les détails du projet ${title}`}
          >
            Détails
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </motion.article>
  );
}
