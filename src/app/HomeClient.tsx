"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import PortfolioShowcase from "@/components/sections/PortfolioShowcase";
import ContactSection from "@/components/sections/contact/ContactSection";
import WelcomeScreen from "@/components/WelcomeScreen";
import type { PublicPortfolioData } from "@/types";
import usePortfolio from "@/hooks/usePortfolio";

const INTRO_VISIBLE_MS = 700;
const INTRO_MAX_WAIT_MS = 2000;

export default function HomeClient({
  initialPortfolio,
}: {
  initialPortfolio: PublicPortfolioData;
}) {
  const [showWelcome, setShowWelcome] = useState(false);
  const portfolio = usePortfolio(initialPortfolio);
  const [badgeEntranceActive, setBadgeEntranceActive] = useState(false);
  const badgeReadyRef = useRef(false);
  const introElapsedRef = useRef(false);

  const handleBadgeReady = useCallback(() => {
    badgeReadyRef.current = true;

    if (introElapsedRef.current) {
      setShowWelcome(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const skipTimer = window.setTimeout(() => {
        setShowWelcome(false);
        setBadgeEntranceActive(true);
      }, 0);
      return () => window.clearTimeout(skipTimer);
    }

    window.scrollTo({ top: 0, behavior: "auto" });
    const startTimer = window.setTimeout(() => setShowWelcome(true), 0);

    const requiresBadge =
      window.matchMedia("(min-width: 768px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (requiresBadge) {
      void import("@/components/band/App");
    }

    const minTimer = window.setTimeout(() => {
      introElapsedRef.current = true;

      if (!requiresBadge || badgeReadyRef.current) {
        setShowWelcome(false);
      }
    }, INTRO_VISIBLE_MS);

    const maxTimer = window.setTimeout(() => {
      setShowWelcome(false);
    }, INTRO_MAX_WAIT_MS);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
    };
  }, []);

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <main className="relative overflow-x-hidden">
        <AnimatedBackground />

        <div className="relative z-[2]">
          <Navbar />
          <Hero
            onBadgeReady={handleBadgeReady}
            startBadgeEntrance={badgeEntranceActive}
          />
          <About
            initialProjectCount={portfolio.projects.length}
            initialCertificateCount={portfolio.certificates.length}
          />
          <PortfolioShowcase portfolio={portfolio} />
          <ContactSection />
        </div>

        <AnimatePresence
          onExitComplete={() => {
            setBadgeEntranceActive(true);
          }}
        >
          {showWelcome && (
            <motion.div
              key="welcome"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 1, y: "-100%" }}
              transition={{ duration: 0.24, ease: [0.76, 0, 0.24, 1] }}
              className="fixed inset-0 z-[9999]"
            >
              <WelcomeScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
