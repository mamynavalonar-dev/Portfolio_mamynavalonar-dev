"use client";

import { motion } from "framer-motion";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { ArrowRight, ArrowUpRight } from "lucide-react";

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
    <motion.div
      initial={{
        opacity: 0,
        x: index % 2 === 0 ? -50 : 50,
        y: 20,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.25,
        delay: index * 0.06,
      }}
      whileHover={{ y: -4 }}
      className="group relative rounded-[26px] border border-white/10 bg-white/5 p-4 flex flex-col min-h-[270px]"
    >
      <div className="w-full h-36 rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] mb-3">
        {image ? (
          <ResponsiveImage
            src={image}
            alt={`Aperçu du projet ${title}`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.03]" />
        )}
      </div>

      <h3 className="text-[17px] font-semibold mb-2 leading-tight">{title}</h3>

      <p className="text-[13px] text-white/60 leading-relaxed line-clamp-2 min-h-[38px]">
        {description}
      </p>

      <div className="mt-auto pt-4 flex items-center justify-between">
        {live_url ? (
          <a
            href={live_url}
            target="_blank"
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
            onClick={onDetailsClick}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2 text-[13px]"
          >
            Détails
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
