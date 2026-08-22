"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  GitBranch,
  Code2,
  ArrowRight,
  Images,
} from "lucide-react";
import { Project } from "@/types";
import { toStringList } from "@/lib/projectFields";
import ResponsiveImage from "@/components/ui/ResponsiveImage";

type PortfolioModalProps = {
  project: Project | null;
  onClose: () => void;
};

export default function PortfolioModal({
  project,
  onClose,
}: PortfolioModalProps) {
  const isOpen = !!project;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveImageIndex(0);
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  const tech = project ? toStringList(project.technologies) : [];

  const galleryImages =
    project?.image_urls &&
    Array.isArray(project.image_urls) &&
    project.image_urls.length > 0
      ? project.image_urls.filter(Boolean)
      : project?.image_url
        ? [project.image_url]
        : [];

  const safeImageIndex =
    galleryImages.length > 0
      ? Math.min(activeImageIndex, galleryImages.length - 1)
      : 0;

  const activeImage = galleryImages[safeImageIndex] ?? null;

  const closeModal = () => {
    setActiveImageIndex(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeModal}
          className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center px-4 py-5 sm:px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.965 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-dialog-title"
            className="w-full max-w-[900px] max-h-[94vh] overflow-y-auto custom-scroll rounded-[30px] bg-[#0d0e11]/98 border border-white/10 backdrop-blur-2xl shadow-[0_35px_110px_rgba(0,0,0,0.72)]"
          >
            <div className="relative p-3 sm:p-4 pb-0">
              <div className="relative w-full h-[250px] sm:h-[360px] lg:h-[410px] rounded-[22px] overflow-hidden bg-white/[0.03] border border-white/10">
                {activeImage ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${project.id}-${safeImageIndex}`}
                      initial={{ opacity: 0.35, scale: 1.01 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0.2 }}
                      transition={{ duration: 0.18 }}
                      className="w-full h-full"
                    >
                      <ResponsiveImage
                        src={activeImage}
                        alt={`${project.title} — aperçu ${safeImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="w-full h-full bg-white/[0.03]" />
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5" />
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeModal}
                className="absolute top-7 right-7 sm:top-8 sm:right-8 w-10 h-10 rounded-full bg-black/70 border border-white/15 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/90 transition"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            {galleryImages.length > 1 && (
              <div className="px-4 sm:px-6 pt-4">
                <div className="flex items-center gap-2 mb-2 text-white/45">
                  <Images size={14} />
                  <span className="text-[11px] uppercase tracking-[0.16em]">
                    Aperçus
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 custom-scroll">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`relative shrink-0 w-[88px] h-[58px] rounded-xl overflow-hidden border transition ${
                        index === safeImageIndex
                          ? "border-white/70 ring-1 ring-white/20"
                          : "border-white/10 opacity-60 hover:opacity-100"
                      }`}
                      aria-label={`Afficher l'aperçu ${index + 1}`}
                    >
                      <ResponsiveImage
                        src={image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-5 sm:p-7 lg:p-8 pt-6">
              <h2
                id="portfolio-dialog-title"
                className="text-2xl sm:text-3xl lg:text-[34px] font-bold mb-4"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {project.title}
              </h2>

              <p className="text-[13px] sm:text-[15px] leading-7 text-white/62 max-w-3xl">
                {project.description}
              </p>

              {tech.length > 0 && (
                <div className="mt-7">
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 size={15} className="text-white/60" />
                    <h4
                      className="text-[13px] font-semibold tracking-wide"
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                      Technologies
                    </h4>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {tech.map((technology) => (
                      <span
                        key={technology}
                        className="px-3.5 py-1.5 rounded-lg bg-white/[0.055] border border-white/10 text-[12px] text-white/78"
                      >
                        {technology}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
                {project.live_url ? (
                  <a
                    href={project.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
                  >
                    <ExternalLink size={15} />
                    Live Site
                  </a>
                ) : (
                  <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/10 text-white/35 text-sm">
                    <ExternalLink size={15} />
                    Aucun lien
                  </div>
                )}

                {project.github_url ? (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/15 text-white font-medium text-sm hover:bg-white/[0.06] transition"
                  >
                    <GitBranch size={15} />
                    GitHub
                  </a>
                ) : (
                  <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/10 text-white/35 text-sm">
                    <GitBranch size={15} />
                    Aucun lien
                  </div>
                )}

                <a
                  href={`/portfolio/${project.id}`}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.055] text-white font-semibold text-sm hover:bg-white/[0.1] transition"
                >
                  Voir le détail
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
