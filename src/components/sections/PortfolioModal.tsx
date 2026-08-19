"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, GitBranch, Code2 } from "lucide-react";
import { Project } from "@/types";

type PortfolioModalProps = {
  project: Project | null;
  onClose: () => void;
};

export default function PortfolioModal({
  project,
  onClose,
}: PortfolioModalProps) {
  const isOpen = !!project;

  const tech = project
    ? (project.technologies || "")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "")
    : [];

  const galleryImages =
    project?.image_urls &&
    Array.isArray(project.image_urls) &&
    project.image_urls.length > 0
      ? project.image_urls
      : project?.image_url
        ? [project.image_url]
        : [];

  return (
    <AnimatePresence>
      {isOpen && project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 z-[999] bg-black/75 backdrop-blur-md flex items-center justify-center px-4 py-6 sm:px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[620px] max-h-[92vh] overflow-y-auto custom-scroll rounded-[28px] bg-[#0d0e11]/95 border border-white/10 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
          >
            {/* IMAGE */}
            <div className="relative w-full h-[220px] sm:h-[280px] rounded-t-[28px] overflow-hidden bg-white/[0.03]">
              {galleryImages.length > 0 ? (
                <img
                  src={galleryImages[0]}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-white/[0.03]" />
              )}

              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 border border-white/15 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/80 transition"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="p-5 sm:p-7">
              <h2
                className="text-2xl sm:text-[28px] font-bold mb-4"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {project.title}
              </h2>

              <p className="text-[13px] sm:text-sm leading-7 text-white/60">
                {project.description}
              </p>

              {/* TECHNOLOGIES */}
              {tech.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 size={14} className="text-white/60" />
                    <h4
                      className="text-[13px] font-semibold tracking-wide"
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                      Technologies
                    </h4>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {tech.map((t, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-[12px] text-white/75"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row gap-3 mt-7">
                {project.live_url ? (
                  <a
                    href={project.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-black font-medium text-sm hover:opacity-90 transition"
                  >
                    <ExternalLink size={15} />
                    Live Site
                  </a>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/10 text-white/35 text-sm">
                    <ExternalLink size={15} />
                    Aucun lien
                  </div>
                )}

                {project.github_url ? (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/15 text-white font-medium text-sm hover:bg-white/5 transition"
                  >
                    <GitBranch size={15} />
                    GitHub
                  </a>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/10 text-white/35 text-sm">
                    <GitBranch size={15} />
                    Aucun lien
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
