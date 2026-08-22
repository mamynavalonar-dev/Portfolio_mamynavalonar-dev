"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import PortfolioShowcase from "@/components/sections/PortfolioShowcase";
import ContactSection from "@/components/sections/contact/ContactSection";
import WelcomeScreen from "@/components/WelcomeScreen";
import type { PublicPortfolioData } from "@/types";

const INTRO_VISIBLE_MS = 700;

export default function HomeClient({
  initialPortfolio,
}: {
  initialPortfolio: PublicPortfolioData;
}) {
  // Le landing est présent dès le premier rendu. L'application complète se
  // prépare simultanément derrière lui, y compris le badge 3D.
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (window.location.hash) {
      const skipTimer = window.setTimeout(() => setShowWelcome(false), 0);
      return () => window.clearTimeout(skipTimer);
    }

    window.scrollTo({ top: 0, behavior: "auto" });

    const timer = window.setTimeout(() => {
      setShowWelcome(false);
    }, INTRO_VISIBLE_MS);

    return () => window.clearTimeout(timer);
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
          <Hero />
          <About
            initialProjectCount={initialPortfolio.projects.length}
            initialCertificateCount={initialPortfolio.certificates.length}
          />
          <PortfolioShowcase initialPortfolio={initialPortfolio} />
          <ContactSection />
        </div>

        <AnimatePresence>
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
