"use client";

import { useEffect, useRef, useState } from "react";
import type { TechStack } from "@/types";
import { selectHeroTechnologies } from "@/lib/journey";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import styles from "./TechnologyMarquee.module.css";

export default function TechnologyMarquee({ technologies, enabled }: { technologies: TechStack[]; enabled: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const firstGroupRef = useRef<HTMLUListElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const techs = selectHeroTechnologies(technologies);
  const hasTechnologies = techs.length > 0;
  const technologyLayout = techs.map((tech) => `${tech.id}:${tech.name}`).join("|");
  const repeat = techs.length ? Math.max(1, Math.ceil(12 / techs.length)) : 1;

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "80px" });
    observer.observe(node);
    const handleVisibility = () => setDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [hasTechnologies]);

  useEffect(() => {
    const group = firstGroupRef.current;
    const track = trackRef.current;
    if (!group || !track) return;
    const measure = () => {
      // Une vitesse de 26 px/s reste douce même avec beaucoup de logos.
      const width = group.getBoundingClientRect().width;
      if (width > 0) track.style.setProperty("--marquee-duration", `${Math.max(60, width / 26)}s`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(group); measure();
    return () => observer.disconnect();
  }, [technologyLayout]);

  if (!techs.length) return null;
  const running = enabled && inView && documentVisible;
  return (
    <section ref={sectionRef} aria-labelledby="technology-marquee-title" className={styles.section}>
      <div className={styles.header}>
        <h2 id="technology-marquee-title" className={styles.title}>Les technologies avec lesquelles je travaille</h2>
      </div>
      <p id="technology-scroll-help" className="sr-only">Le défilement se met en pause au survol et lorsque ce bandeau reçoit le focus au clavier.</p>
      <div className={styles.viewport} tabIndex={0} aria-label="Liste des technologies, défilement horizontal" aria-describedby="technology-scroll-help">
        <div ref={trackRef} className={styles.track} data-running={running}>
          {[0, 1].map((group) => <ul ref={group === 0 ? firstGroupRef : undefined} key={group} className={styles.group} aria-hidden={group === 1 ? true : undefined}>
            {Array.from({ length: repeat }, (_, cycle) => techs.map((tech) => <li key={`${cycle}-${tech.id}`} className={styles.item} aria-hidden={cycle > 0 ? true : undefined}>
              <span className={styles.logo}>{enabled && tech.logo_url && <ResponsiveImage src={tech.logo_url} alt="" width={30} height={30} sizes="30px" loading="lazy" />}</span><span>{tech.name}</span>
            </li>))}
          </ul>)}
        </div>
      </div>
    </section>
  );
}
