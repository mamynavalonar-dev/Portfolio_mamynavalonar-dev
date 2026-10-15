"use client";

import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import PortfolioShowcase from "@/components/sections/PortfolioShowcase";
import ContactSection from "@/components/sections/contact/ContactSection";
import ServicesSection from "@/components/sections/ServicesSection";
import JourneySection from "@/components/sections/JourneySection";
import TechnologyMarquee from "@/components/sections/TechnologyMarquee";
import WelcomeScreen from "@/components/WelcomeScreen";
import type { PublicPortfolioData } from "@/types";
import usePortfolio from "@/hooks/usePortfolio";
import { INTRO_CRITICAL_CSS, INTRO_NOSCRIPT_CSS } from "@/lib/introStyles";
import { markStartup } from "@/lib/startupMetrics";

const StableNavbar = memo(Navbar);
const StableAbout = memo(About);
const StablePortfolioShowcase = memo(PortfolioShowcase);
const StableContactSection = memo(ContactSection);
const StableServicesSection = memo(ServicesSection);
const StableJourneySection = memo(JourneySection);
const StableTechnologyMarquee = memo(TechnologyMarquee);
const EMPTY_SERVICES: NonNullable<PublicPortfolioData["services"]> = [];
const EMPTY_JOURNEY: NonNullable<PublicPortfolioData["journey"]> = [];

const INTRO_VISIBLE_MS = 700;
const INTRO_MAX_WAIT_MS = 1400;
const DECORATIONS_DEFER_MS = 1800;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const BADGE_MOTION_QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function shouldSkipIntro() {
  return Boolean(window.location.hash) || window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export default function HomeClient({
  initialPortfolio,
}: {
  initialPortfolio: PublicPortfolioData;
}) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [introStarted, setIntroStarted] = useState(false);
  const handleIntroEntranceStart = useCallback(() => {
    markStartup("intro-entrance-started");
    setIntroStarted(true);
  }, []);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const portfolio = usePortfolio(initialPortfolio);
  const [badgeEntranceActive, setBadgeEntranceActive] = useState(false);
  const [badgeReady, setBadgeReady] = useState(false);
  const [badgeMoving, setBadgeMoving] = useState(false);
  const [decorationsActive, setDecorationsActive] = useState(false);
  const badgeReadyRef = useRef(false);
  const badgeFailedRef = useRef(false);
  const introElapsedRef = useRef(false);

  const handleBadgeReady = useCallback(() => {
    badgeReadyRef.current = true;
    setBadgeReady(true);
    if (introElapsedRef.current) setShowWelcome(false);
  }, []);

  const handleBadgeUnavailable = useCallback(() => {
    badgeFailedRef.current = true;
    setBadgeReady(false);
    if (introElapsedRef.current) setShowWelcome(false);
  }, []);

  useEffect(() => {
    if (!badgeEntranceActive || (window.matchMedia(BADGE_MOTION_QUERY).matches && !badgeReady)) return;
    // La chute et le premier dessin du badge passent avant les effets textuels.
    const timer = window.setTimeout(() => setDecorationsActive(true), DECORATIONS_DEFER_MS);
    return () => window.clearTimeout(timer);
  }, [badgeReady, badgeEntranceActive]);

  useEffect(() => {
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

    if (shouldSkipIntro()) {
      const skipTimer = window.setTimeout(() => {
        setShowWelcome(false);
        markStartup("intro-complete");
        setBadgeEntranceActive(true);
      }, 0);
      return () => window.clearTimeout(skipTimer);
    }

    window.scrollTo({ top: 0, behavior: "auto" });
    const requiresBadge = window.matchMedia(BADGE_MOTION_QUERY).matches;

    const minTimer = introStarted ? window.setTimeout(() => {
      introElapsedRef.current = true;
      if (!requiresBadge || badgeReadyRef.current || badgeFailedRef.current) {
        setShowWelcome(false);
      }
    }, INTRO_VISIBLE_MS) : undefined;

    // Une connexion lente ne doit pas bloquer l'accès au portfolio.
    const maxTimer = introStarted ? window.setTimeout(() => {
      setShowWelcome(false);
    }, INTRO_MAX_WAIT_MS) : undefined;

    const handleIntroPreferenceChange = () => {
      if (shouldSkipIntro()) {
        setShowWelcome(false);
        markStartup("intro-complete");
        setBadgeEntranceActive(true);
      }
    };

    window.addEventListener("hashchange", handleIntroPreferenceChange);
    reducedMotion.addEventListener("change", handleIntroPreferenceChange);

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      window.removeEventListener("hashchange", handleIntroPreferenceChange);
      reducedMotion.removeEventListener("change", handleIntroPreferenceChange);
    };
  }, [introStarted]);

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <main className="relative overflow-x-hidden">
        <style>{INTRO_CRITICAL_CSS}</style>
        <noscript>
          <style>{INTRO_NOSCRIPT_CSS}</style>
        </noscript>

        <AnimatedBackground enabled={decorationsActive && !badgeMoving} />

        <div
          data-portfolio-content=""
          data-intro-pending={showWelcome}
          className="relative z-[2]"
          inert={hydrated && showWelcome && !shouldSkipIntro()}
        >
          <StableNavbar
            hasServices={Boolean(initialPortfolio.services?.some((service) => service.published))}
            hasJourney={Boolean(initialPortfolio.journey?.some((entry) => entry.published))}
          />
          <Hero
            onBadgeReady={handleBadgeReady}
            onBadgeUnavailable={handleBadgeUnavailable}
            onBadgeMotionChange={setBadgeMoving}
            startBadgeEntrance={badgeEntranceActive}
            animateDecorations={decorationsActive && !badgeMoving}
          />
          <StableTechnologyMarquee technologies={portfolio.techStacks} enabled={badgeEntranceActive} />
          <StableAbout
            initialProjectCount={portfolio.projects.length}
            initialCertificateCount={portfolio.certificates.length}
          />
          <StableServicesSection services={initialPortfolio.services ?? EMPTY_SERVICES} />
          <StableJourneySection entries={initialPortfolio.journey ?? EMPTY_JOURNEY} />
          <StablePortfolioShowcase portfolio={portfolio} />
          <StableContactSection social={initialPortfolio.social} />
        </div>

        <AnimatePresence
          onExitComplete={() => {
            markStartup("intro-complete");
            setBadgeEntranceActive(true);
          }}
        >
          {showWelcome && (
            <motion.div
              key="welcome"
              data-portfolio-intro=""
              aria-hidden="true"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 1, y: "-100%" }}
              transition={{ duration: 0.24, ease: [0.76, 0, 0.24, 1] }}
              className="fixed inset-0 z-[9999]"
              style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#000" }}
            >
              <WelcomeScreen onEntranceStart={handleIntroEntranceStart} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
