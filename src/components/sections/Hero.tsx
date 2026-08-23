"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowDown, Circle } from "lucide-react";
import TextType from "@/components/band/TextType";
import ShinyText from "@/components/ui/ShinyText";

const BandApp = dynamic(() => import("@/components/band/App"), {
  ssr: false,
});

const skills = ["Typescript", "React.js", "Tailwind"];

export default function Hero({
  onBadgeReady,
  startBadgeEntrance = false,
}: {
  onBadgeReady?: () => void;
  startBadgeEntrance?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [isLanyardDragging, setIsLanyardDragging] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const startAnim = true;

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const scrollIndicatorOpacity = useTransform(
    scrollYProgress,
    [0, 0.55, 0.9, 1],
    [1, 1, 0.15, 0],
  );
  const scrollIndicatorY = useTransform(
    scrollYProgress,
    [0, 0.55, 1],
    [0, 0, 26],
  );

  const scrollToPortfolio = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document
      .getElementById("portfolio")
      ?.scrollIntoView({ behavior: "auto" });
  };

  return (
    <section
      ref={heroRef}
      id="home"
      className="relative isolate flex min-h-screen items-center justify-start overflow-visible px-6 md:pl-[120px] md:pr-[60px]"
    >
      {!reducedMotion && (
        <div
          className={`pointer-events-none absolute inset-0 hidden overflow-visible md:block ${
            isLanyardDragging ? "z-[8]" : "z-[4]"
          }`}
        >
          <BandApp
            onDragChange={setIsLanyardDragging}
            onReady={onBadgeReady}
            startEntrance={startBadgeEntrance}
          />
        </div>
      )}

      <div className="relative z-[5] w-full md:max-w-[600px]">
        <motion.div
          initial={false}
          animate={
            startAnim
              ? { opacity: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, y: 30, filter: "blur(12px)" }
          }
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 flex items-center gap-2"
        >
          <Circle size={8} className="fill-emerald-400 text-emerald-400" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            RAKOTONIAINA Mamy Navalona Antonio
          </span>
        </motion.div>

        <div>
          <motion.h1
            initial={false}
            animate={
              startAnim
                ? { opacity: 1, scale: 1, y: 0 }
                : { opacity: 0, scale: 0.85, y: 50 }
            }
            transition={{
              duration: 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-block w-max max-w-none overflow-visible whitespace-nowrap pr-[0.22em] text-[clamp(32px,6vw,62px)] font-extrabold leading-[1.05] tracking-[-0.03em]"
          >
            <ShinyText
              text="Développeur"
              speed={2.8}
              delay={0.2}
              color="#b5b5b5"
              shineColor="#ffffff"
              spread={115}
              direction="left"
              yoyo
              disabled={Boolean(reducedMotion)}
            />
          </motion.h1>

          <motion.h1
            initial={false}
            animate={
              startAnim
                ? { opacity: 1, x: 0, rotate: 0 }
                : { opacity: 0, x: -80, rotate: -4 }
            }
            transition={{
              duration: 0.24,
              delay: 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mb-6 text-[clamp(32px,6vw,62px)] font-extrabold leading-[1.05] tracking-[-0.03em]"
          >
            <ShinyText
              text="Full Stack"
              speed={2.8}
              delay={0.8}
              color="#888888"
              shineColor="#f5f5f5"
              spread={115}
              direction="left"
              yoyo
              disabled={Boolean(reducedMotion)}
            />
          </motion.h1>
        </div>

        <motion.div
          initial={false}
          animate={startAnim ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
          transition={{ duration: 0.22, delay: 0.04 }}
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
              typingSpeed={24}
              pauseDuration={900}
              showCursor
              cursorCharacter="_"
              deletingSpeed={16}
              cursorBlinkDuration={0.5}
            />
          </span>
        </motion.div>

        <motion.div
          initial={false}
          animate={
            startAnim
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 50, scale: 0.96 }
          }
          transition={{ duration: 0.24, delay: 0.05 }}
          className="mb-7 w-full max-w-[460px]"
        >
          <p
            className="text-sm leading-[1.9] tracking-[0.01em] text-white/75"
            style={{ textWrap: "pretty" }}
          >
            Je conçois des applications web modernes, performantes et sécurisées,
            pensées pour offrir une expérience fluide sur tous les appareils.
            J&apos;accorde une attention particulière à la qualité du code, à la
            fiabilité, à la protection des données et à la maintenabilité afin de
            créer des solutions professionnelles capables d&apos;évoluer avec les
            besoins des utilisateurs.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={startAnim ? "visible" : "hidden"}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.035,
                delayChildren: 0.06,
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
              transition={{ duration: 0.2 }}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 font-mono text-[11px] text-[var(--text-secondary)]"
            >
              {skill}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          initial={false}
          animate={startAnim ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.22, delay: 0.08 }}
          className="mb-7"
        >
          <a href="#portfolio" onClick={scrollToPortfolio} className="btn-glow">
            Voir mes projets
            <ArrowDown size={15} />
          </a>
        </motion.div>

        <motion.div
          initial={false}
          animate={startAnim ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
          transition={{ duration: 0.22, delay: 0.1 }}
          className="flex flex-col gap-1.5"
        >
          <span className="font-mono text-[13px] text-[var(--text-muted)]">
            Découvrez mes projets ci-dessous
          </span>

          <span className="font-mono text-[13px] text-[var(--text-muted)]">
            Disponible pour des opportunités professionnelles, des collaborations et des missions freelance
          </span>
        </motion.div>
      </div>

      <motion.div
        style={{
          opacity: scrollIndicatorOpacity,
          y: scrollIndicatorY,
        }}
        className="pointer-events-none absolute bottom-9 left-1/2 z-20 -translate-x-1/2"
      >
        <motion.div
          animate={
            reducedMotion
              ? undefined
              : {
                  y: [0, -7, 0, 7, 0],
                }
          }
          transition={
            reducedMotion
              ? undefined
              : {
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
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
