"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Navbar({ hasServices = false, hasJourney = false }: { hasServices?: boolean; hasJourney?: boolean }) {
  const navItems = useMemo(() => [
    { label: "Accueil", id: "home" },
    { label: "À propos", id: "about" },
    ...(hasServices ? [{ label: "Services", id: "services" }] : []),
    ...(hasJourney ? [{ label: "Parcours", id: "qualifications" }] : []),
    { label: "Portfolio", id: "portfolio" },
    { label: "Contact", id: "contact" },
  ], [hasServices, hasJourney]);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateFromScroll = () => {
      frameRef.current = null;
      setScrolled(window.scrollY > 20);
    };

    const scheduleUpdate = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(updateFromScroll);
    };

    updateFromScroll();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [navItems]);

  useEffect(() => {
    let observer: IntersectionObserver;
    const observeSections = () => {
      observer?.disconnect();
      const marker = Math.min(120, Math.max(0, window.innerHeight - 1));
      observer = new IntersectionObserver((entries) => {
        const entry = entries.find((item) => item.isIntersecting);
        if (entry) setActiveSection(entry.target.id);
      }, { rootMargin: `-${marker}px 0px -${Math.max(0, window.innerHeight - marker - 1)}px 0px`, threshold: 0 });
      for (const item of navItems) {
        const section = document.getElementById(item.id);
        if (section) observer.observe(section);
      }
    };
    observeSections();
    window.addEventListener("resize", observeSections, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("resize", observeSections); };
  }, [navItems]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const goToSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    event.preventDefault();
    setActiveSection(sectionId);
    setOpen(false);

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });

    window.history.replaceState(null, "", `#${sectionId}`);
  };

  return (
    <motion.nav
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed left-5 right-5 top-5 z-50 md:left-[60px] md:right-[60px]"
    >
      <div
        className={`glass-panel flex w-full items-center justify-between rounded-full px-6 py-2.5 transition-colors duration-150 ${
          scrolled ? "shadow-[var(--shadow-soft)]" : ""
        }`}
        style={{
          backgroundColor: scrolled
            ? "var(--glass-bg-scrolled)"
            : "var(--glass-bg)",
        }}
      >
        <a
          href="#home"
          onClick={(event) => goToSection(event, "home")}
          className="font-mono text-[13px] tracking-[0.1em] text-[var(--text-secondary)]"
        >
          mamynavalonar-dev
        </a>

        <div className="hidden items-center gap-6 lg:flex xl:gap-9">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;

            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => goToSection(event, item.id)}
                className={`relative cursor-pointer pb-1 font-mono text-[13px] tracking-[0.08em] transition-colors duration-150 ${
                  isActive
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="navbar-underline"
                    className="absolute bottom-0 left-0 h-px w-full bg-white"
                    transition={{ duration: 0.16 }}
                  />
                )}
              </a>
            );
          })}
        </div>

        <button
          type="button"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-11 items-center justify-center text-[var(--text-primary)] lg:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-navigation"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="glass-panel mt-2 overflow-hidden rounded-2xl bg-[var(--glass-bg-scrolled)] p-2 lg:hidden"
          >
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => goToSection(event, item.id)}
                className={`block rounded-xl px-4 py-3 font-mono text-sm ${
                  activeSection === item.id
                    ? "bg-white/10 text-white"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {item.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
