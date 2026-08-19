"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Circle } from "lucide-react";
import App from "@/components/band/App";
import TextType from "@/components/band/TextType";
import ShapeGrid from "@/components/ShapeGrid";

const skills = ["Typescript", "React.js", "Tailwind"];

type HeroProps = {
  showApp: boolean;
};

export default function Hero({ showApp }: HeroProps) {
  const [startAnim, setStartAnim] = useState(false);

  useEffect(() => {
    const heroPlayed = sessionStorage.getItem("heroPlayed");
    const delay = heroPlayed === "true" ? 0 : 3600;

    const textTimer = setTimeout(() => {
      setStartAnim(true);
    }, delay);

    const appTimer =
      heroPlayed === "true"
        ? undefined
        : setTimeout(() => {
            sessionStorage.setItem("heroPlayed", "true");
          }, delay + 1500);

    return () => {
      clearTimeout(textTimer);
      if (appTimer) clearTimeout(appTimer);
    };
  }, []);

  const scrollToPortfolio = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document
      .getElementById("portfolio")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-start overflow-hidden px-6 md:pl-[120px] md:pr-[60px]"
    >
      {/* BACKGROUND GRID */}
      <div className="absolute inset-0 z-0">
        <ShapeGrid
          shape="hexagon"
          squareSize={40}
          direction="diagonal"
          speed={0.3}
          borderColor="#2a2a2a"
          hoverFillColor="rgba(255,255,255,0.06)"
          hoverTrailAmount={6}
        />
      </div>

      {/* HALO DE LUMIÈRE */}
      <div className="glow-bg absolute inset-0 z-[1] pointer-events-none" />

      {/* APP LAYER */}
      <div
        className="absolute inset-0 z-40"
        style={{ pointerEvents: showApp ? "auto" : "none" }}
      >
        {showApp && <App />}
      </div>

      {/* TEXT */}
      <div className="relative z-[5] w-full md:max-w-[600px]">
        {/* LABEL */}
        <motion.div
          initial={false}
          animate={
            startAnim
              ? { opacity: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, y: 30, filter: "blur(12px)" }
          }
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 flex items-center gap-2"
        >
          <Circle size={8} className="fill-emerald-400 text-emerald-400" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            RAKOTONIAINA Mamy Navalona Antonio
          </span>
        </motion.div>

        {/* HEADING */}
        <div>
          <motion.h1
            initial={false}
            animate={
              startAnim
                ? { opacity: 1, scale: 1, y: 0 }
                : { opacity: 0, scale: 0.85, y: 50 }
            }
            transition={{
              duration: 1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-gradient text-[clamp(32px,6vw,62px)] font-extrabold leading-[1.05] tracking-[-0.03em]"
          >
            Développeur
          </motion.h1>

          <motion.h1
            initial={false}
            animate={
              startAnim
                ? { opacity: 1, x: 0, rotate: 0 }
                : { opacity: 0, x: -80, rotate: -4 }
            }
            transition={{
              duration: 1,
              delay: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mb-6 text-[clamp(32px,6vw,62px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--text-secondary)]"
          >
            Full Stack
          </motion.h1>
        </div>

        {/* STATUS */}
        <motion.div
          initial={false}
          animate={startAnim ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="mb-3"
        >
          <span className="font-mono text-[15px] tracking-[0.1em] text-[var(--text-secondary)]">
            <TextType
              text={[
                "Développeur Full Stack junior",
                "Développeur Web",
                "React • Next.js • TypeScript",
                "Ouvert aux opportunités",
              ]}
              typingSpeed={75}
              pauseDuration={1500}
              showCursor
              cursorCharacter="_"
              deletingSpeed={50}
              cursorBlinkDuration={0.5}
            />
          </span>
        </motion.div>

        {/* DESC */}
        <motion.div
          initial={false}
          animate={
            startAnim
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 50, scale: 0.96 }
          }
          transition={{ duration: 1, delay: 0.5 }}
          className="mb-7 w-full max-w-[460px]"
        >
          <p
            className="text-sm leading-[1.9] tracking-[0.01em] text-[var(--text-secondary)]"
            style={{ textWrap: "pretty" }}
          >
            Je crée des sites web modernes à l&apos;apparence épurée, responsive
            et élégante. Je transforme des idées et des designs en expériences
            numériques attrayantes et faciles à utiliser.
          </p>
        </motion.div>

        {/* SKILLS */}
        <motion.div
          initial="hidden"
          animate={startAnim ? "visible" : "hidden"}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.12,
                delayChildren: 0.7,
              },
            },
          }}
          className="mb-7 flex flex-wrap gap-2"
        >
          {skills.map((skill) => (
            <motion.span
              key={skill}
              variants={{
                hidden: { opacity: 0, y: 25, scale: 0.85 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              transition={{ duration: 0.5 }}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 font-mono text-[11px] text-[var(--text-secondary)]"
            >
              {skill}
            </motion.span>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={false}
          animate={startAnim ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          className="mb-7"
        >
          <a href="#portfolio" onClick={scrollToPortfolio} className="btn-glow">
            Voir mes projets
            <ArrowDown size={15} />
          </a>
        </motion.div>

        {/* FOOTER */}
        <motion.div
          initial={false}
          animate={startAnim ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-col gap-1.5"
        >
          <span className="font-mono text-[13px] text-[var(--text-muted)]">
            Découvrez mes projets ci-dessous
          </span>

          <span className="font-mono text-[13px] text-[var(--text-muted)]">
            Ouvert aux opportunités à temps plein, temps partiel et en freelance
          </span>
        </motion.div>
      </div>

      {/* SCROLL INDICATOR */}
      <motion.div
        initial={false}
        animate={startAnim ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{
          duration: 0.9,
          delay: 1.2,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="pointer-events-none absolute bottom-9 left-1/2 z-20 -translate-x-1/2"
      >
        <motion.div
          animate={{
            y: [0, 6, 0],
            opacity: [1, 0.65, 1],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="flex items-center justify-center gap-2"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Défiler
          </span>
          <ArrowDown size={14} className="text-[var(--text-secondary)]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
