"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [mounted, setMounted] = useState(false);

  // navbar affichÃ©e une seule fois
  const [showNavbar, setShowNavbar] = useState(false);

  // Empêche handleScroll de modifier activeSection pendant un scroll
  // programmé (clic sur un lien) — c'est ça qui causait la "vibration"
  // du menu/soulignement pendant l'animation.
  const isProgrammaticScroll = useRef(false);
  const scrollAnimationId = useRef<number | null>(null);
  const settleTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Pendant un scroll déclenché par un clic sur le menu, on ne
      // recalcule pas la section active : ça évite l'oscillation
      // rapide entre deux sections (et donc le tremblement visuel)
      // le temps que le scroll atteigne sa cible.
      if (isProgrammaticScroll.current) return;

      const sections = ["home", "about", "portfolio", "contact"];

      for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (!section) continue;

        const rect = section.getBoundingClientRect();

        if (rect.top <= 140 && rect.bottom >= 140) {
          setActiveSection(sectionId);
          break;
        }
      }
    };

    
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
      handleResize();
      handleScroll();
    });

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // animation navbar uniquement au refresh
  useEffect(() => {
    const navbarPlayed = sessionStorage.getItem("navbarPlayed");
    const delay = navbarPlayed ? 0 : 3800;

    const timer = setTimeout(() => {
      setShowNavbar(true);
      if (!navbarPlayed) {
        sessionStorage.setItem("navbarPlayed", "true");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  // Nettoyage des timers/animations en cours si le composant se démonte
  useEffect(() => {
    return () => {
      if (scrollAnimationId.current) {
        cancelAnimationFrame(scrollAnimationId.current);
      }
      if (settleTimeoutId.current) {
        clearTimeout(settleTimeoutId.current);
      }
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  if (!mounted) return null;

  const smoothScrollTo = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    e.preventDefault();

    const target = document.querySelector(targetId);
    if (!target) return;

    // Si un scroll programmé précédent est encore en cours, on l'annule
    // proprement avant d'en lancer un nouveau (et on restaure le
    // scroll-behavior au cas où il aurait été laissé sur "auto").
    if (scrollAnimationId.current) {
      cancelAnimationFrame(scrollAnimationId.current);
      scrollAnimationId.current = null;
      document.documentElement.style.scrollBehavior = "";
    }
    if (settleTimeoutId.current) {
      clearTimeout(settleTimeoutId.current);
      settleTimeoutId.current = null;
    }

    const sectionId = targetId.replace("#", "");

    // On fixe immédiatement la section active sur la cible cliquée et on
    // bloque les recalculs de handleScroll jusqu'à la fin de l'animation.
    isProgrammaticScroll.current = true;
    setActiveSection(sectionId);

    // On force temporairement le scroll-behavior natif à "auto" pour
    // empêcher le CSS "scroll-behavior: smooth" (globals.css) de rentrer
    // en conflit avec l'animation JS ci-dessous. Sans ça, le navigateur
    // essaie d'appliquer SON propre smooth-scroll en même temps que
    // window.scrollTo() est appelé à chaque frame par requestAnimationFrame
    // → les deux mécanismes se battent pour la position, ce qui provoque
    // le tremblement/vibration observé sur la navbar et la section.
    const htmlEl = document.documentElement;
    const previousScrollBehavior = htmlEl.style.scrollBehavior;
    htmlEl.style.scrollBehavior = "auto";

    const navbarOffset = 3;
    const targetPosition =
      target.getBoundingClientRect().top + window.scrollY - navbarOffset;

    const startPosition = window.scrollY;
    const distance = targetPosition - startPosition;
    const duration = 1200;

    let startTime: number | null = null;

    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;

      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      const ease = easeInOutCubic(progress);

      window.scrollTo({
        top: startPosition + distance * ease,
      });

      if (timeElapsed < duration) {
        scrollAnimationId.current = requestAnimationFrame(animation);
      } else {
        scrollAnimationId.current = null;

        // On restaure le scroll-behavior d'origine une fois l'animation
        // terminée.
        htmlEl.style.scrollBehavior = previousScrollBehavior;

        // Petit délai de sécurité après la fin de l'animation pour
        // laisser le navigateur "se stabiliser" avant de réactiver
        // le calcul dynamique de la section active.
        settleTimeoutId.current = setTimeout(() => {
          isProgrammaticScroll.current = false;
          settleTimeoutId.current = null;
        }, 150);
      }
    };

    scrollAnimationId.current = requestAnimationFrame(animation);
    setOpen(false);
  };

  const navItems = [
    { label: "Accueil", id: "home" },
    { label: "À propos", id: "about" },
    { label: "Portfolio", id: "portfolio" },
    { label: "Contact", id: "contact" },
  ];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -40 }}
      animate={{
        opacity: showNavbar ? 1 : 0,
        y: showNavbar ? 0 : -40,
      }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="fixed z-50 top-5 left-5 right-5 md:left-[60px] md:right-[60px]"
    >
      <div
        className={`glass-panel flex items-center justify-between w-full rounded-full px-6 py-2.5 transition-colors duration-300 ${
          scrolled ? "shadow-[var(--shadow-soft)]" : ""
        }`}
        style={{
          backgroundColor: scrolled
            ? "var(--glass-bg-scrolled)"
            : "var(--glass-bg)",
        }}
      >
        <span className="font-mono text-[13px] tracking-[0.1em] text-[var(--text-secondary)]">
          mamynavalonar-dev
        </span>

        {!isMobile && (
          <div className="flex items-center gap-10">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;

              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => smoothScrollTo(e, `#${item.id}`)}
                  className={`relative font-mono text-[13px] tracking-[0.08em] pb-1 cursor-pointer transition-colors duration-300 ${
                    isActive
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}

                  {isActive && (
                    <motion.span
                      layoutId="navbar-underline"
                      className="absolute bottom-0 left-0 w-full h-[1px] bg-white"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </a>
              );
            })}
          </div>
        )}

        {isMobile && (
          <button
            type="button"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen(!open)}
            className="flex items-center justify-center w-8 h-8 text-[var(--text-primary)] cursor-pointer"
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={20} />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={20} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isMobile && open && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel mt-2.5 rounded-2xl px-5 py-5 flex flex-col gap-4 overflow-hidden"
            style={{ backgroundColor: "var(--glass-bg-scrolled)" }}
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.id;

              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => smoothScrollTo(e, `#${item.id}`)}
                  className={`font-mono text-[13px] transition-colors duration-300 ${
                    isActive
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
