"use client";

import { useIsPresent } from "framer-motion";
import { Code2, Globe, User } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./WelcomeScreen.module.css";

const icons = [Code2, User, Globe];

export default function WelcomeScreen({ onEntranceStart }: { onEntranceStart?: () => void }) {
  const present = useIsPresent();
  const [started, setStarted] = useState(false);
  const notified = useRef(false);
  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setStarted(true));
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, []);
  useEffect(() => {
    if (!started || notified.current) return;
    notified.current = true;
    onEntranceStart?.();
  }, [started, onEntranceStart]);
  return (
    <div data-portfolio-welcome="" data-intro-started={started} data-intro-exiting={!present} className="fixed inset-0 flex h-dvh items-center justify-center overflow-hidden bg-black px-5 text-white">
      <div className={styles.content}>
        <div className="flex items-center justify-center gap-3">
          {icons.map((Icon, index) => (
            <div key={index} style={{ "--intro-index": index } as CSSProperties} className={`${styles.icon} flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.05]`}>
              <Icon size={17} aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-0.5 overflow-visible">
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 overflow-visible">
            <span className={`${styles.left} text-[clamp(20px,3vw,30px)] font-extrabold leading-tight tracking-[-0.04em]`}>Bienvenue</span>
            <span className={`${styles.right} text-[clamp(20px,3vw,30px)] font-extrabold leading-tight tracking-[-0.04em]`}>sur mon</span>
          </div>
          <p className={`${styles.title} text-[clamp(22px,3.2vw,32px)] font-extrabold leading-tight tracking-[-0.04em]`}>Site Portfolio</p>
        </div>
        <div className={`${styles.address} rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 font-mono text-[11px] tracking-[0.1em] text-white/70`}>portfolio-mamynavalonar-dev.vercel.app</div>
        <div className="h-px w-44 overflow-hidden bg-white/15"><div className={`${styles.bar} h-full origin-left bg-white/80`} /></div>
      </div>
    </div>
  );
}
