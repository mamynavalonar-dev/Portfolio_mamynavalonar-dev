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
import { hasPlayedIntro, setIntroPlayed } from "@/lib/introState";
import type { PublicPortfolioData } from "@/types";

export default function HomeClient({
  initialPortfolio,
}: {
  initialPortfolio: PublicPortfolioData;
}) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showApp, setShowApp] = useState(true);

  useEffect(() => {
    let introTimer: ReturnType<typeof setTimeout> | undefined;

    const initializeTimer = setTimeout(() => {
      const currentHash = window.location.hash;
      const pathname = window.location.pathname;

      if (currentHash === "#portfolio") {
        setShowWelcome(false);
        setShowApp(true);
        return;
      }

      const navEntries = performance.getEntriesByType("navigation");
      const navigationType =
        navEntries.length > 0
          ? (navEntries[0] as PerformanceNavigationTiming).type
          : null;

      if (navigationType === "reload" && pathname === "/") {
        sessionStorage.removeItem("introPlayed");
        sessionStorage.removeItem("heroPlayed");
        if (window.location.hash) history.replaceState(null, "", "/");
        window.scrollTo({ top: 0, behavior: "instant" });
      }

      if (!hasPlayedIntro()) {
        setShowWelcome(true);
        setShowApp(false);
        introTimer = setTimeout(() => {
          setShowWelcome(false);
          setShowApp(true);
          setIntroPlayed();
        }, 2800);
        return;
      }

      setShowWelcome(false);
      setShowApp(true);
    }, 0);

    return () => {
      clearTimeout(initializeTimer);
      if (introTimer) clearTimeout(introTimer);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <main className="relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-[2]">
        <Navbar />
        <Hero showApp={showApp} />
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
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            onAnimationStart={(definition) => {
              if (definition === "exit") setShowApp(true);
            }}
            transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
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
