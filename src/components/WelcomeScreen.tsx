"use client";

import { motion } from "framer-motion";
import { Code2, Globe, User } from "lucide-react";

const icons = [Code2, User, Globe];

export default function WelcomeScreen() {
  return (
    <div className="fixed inset-0 flex h-dvh items-center justify-center overflow-hidden bg-black px-5 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0.92, scale: 1.01 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-[360px] flex-col items-center gap-4 text-center"
      >
        <div className="flex items-center justify-center gap-3">
          {icons.map((Icon, index) => (
            <motion.div
              key={index}
              initial={{
                opacity: 0,
                scale: 0.35,
                rotate: -110,
                y: 28,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                rotate: [0, 5, -3, 0],
                y: [0, -3, 0],
              }}
              exit={{
                opacity: 0,
                scale: 0.75,
                rotate: 35,
                y: -16,
              }}
              transition={{
                delay: 0.03 + index * 0.055,
                duration: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.05]"
            >
              <Icon size={17} aria-hidden="true" />
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-0.5 overflow-visible">
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 overflow-visible">
            <motion.span
              initial={{ opacity: 0, x: 58 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -34 }}
              transition={{
                delay: 0.13,
                duration: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-[clamp(20px,3vw,30px)] font-extrabold leading-tight tracking-[-0.04em]"
            >
              Bienvenue
            </motion.span>

            <motion.span
              initial={{ opacity: 0, x: -58 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 34 }}
              transition={{
                delay: 0.18,
                duration: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-[clamp(20px,3vw,30px)] font-extrabold leading-tight tracking-[-0.04em]"
            >
              sur mon
            </motion.span>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 34, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 22, scale: 0.96 }}
            transition={{
              delay: 0.24,
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-[clamp(22px,3.2vw,32px)] font-extrabold leading-tight tracking-[-0.04em]"
          >
            Site Portfolio
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{
            delay: 0.32,
            duration: 0.24,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 font-mono text-[11px] tracking-[0.1em] text-white/70"
        >
          portfolio-mamynavalonar-dev.vercel.app
        </motion.div>

        <div className="h-px w-44 overflow-hidden bg-white/15">
          <motion.div
            initial={{ scaleX: 0, opacity: 0.4 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{
              delay: 0.39,
              duration: 0.26,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="h-full origin-left bg-white/80"
          />
        </div>
      </motion.div>
    </div>
  );
}