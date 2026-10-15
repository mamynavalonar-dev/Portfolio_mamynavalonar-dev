"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, CalendarDays, FolderGit2, GraduationCap } from "lucide-react";
import type { JourneyEntry, JourneyKind } from "@/types";
import { formatJourneyPeriod, sortJourney } from "@/lib/journey";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import styles from "./PortfolioContent.module.css";

const tabs = [
  { kind: "education", label: "Formations", icon: GraduationCap },
  { kind: "experience", label: "Expériences", icon: BriefcaseBusiness },
  { kind: "project", label: "Projets", icon: FolderGit2 },
] as const;

export default function JourneySection({ entries }: { entries: JourneyEntry[] }) {
  const published = entries.filter((entry) => entry.published);
  const [active, setActive] = useState<JourneyKind>(() => tabs.find((tab) => published.some((entry) => entry.kind === tab.kind))?.kind ?? "education");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  if (!published.length) return null;
  const visible = sortJourney(published.filter((entry) => entry.kind === active));
  const ActiveIcon = tabs.find((tab) => tab.kind === active)!.icon;

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActive(tabs[next].kind);
    tabRefs.current[next]?.focus();
  }

  return (
    <section id="qualifications" aria-labelledby="journey-title" className={styles.section}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Qualifications & expériences</p>
        <h2 id="journey-title" className={styles.title}>Mon parcours</h2>
        <p className={styles.subtitle}>Les étapes, les apprentissages et les projets qui construisent mon expérience.</p>
      </div>
      <div role="tablist" aria-label="Catégories du parcours" className={styles.tabs}>
        {tabs.map((tab, index) => <button key={tab.kind} type="button" role="tab" id={`journey-tab-${tab.kind}`} aria-controls="journey-panel" aria-selected={active === tab.kind} tabIndex={active === tab.kind ? 0 : -1} ref={(node) => { tabRefs.current[index] = node; }} onKeyDown={(event) => navigateTabs(event, index)} onClick={() => setActive(tab.kind)} className={styles.tab}>
          <tab.icon size={18} aria-hidden="true" />{tab.label}<span className={styles.count}>{published.filter((entry) => entry.kind === tab.kind).length}</span>
        </button>)}
      </div>
      <div id="journey-panel" role="tabpanel" aria-labelledby={`journey-tab-${active}`} tabIndex={0}>
        {visible.length ? <ol className={styles.timeline}>
          {visible.map((entry) => <li key={entry.id} className={styles.entry}>
            <article className={styles.entryCard}>
              <div className={styles.entryHeader}>
                <div className={styles.logo}>{entry.logo_url ? <ResponsiveImage src={entry.logo_url} alt="" width={48} height={48} sizes="48px" loading="lazy" /> : <ActiveIcon size={23} aria-hidden="true" />}</div>
                <div><h3 className={styles.entryTitle}>{entry.title}</h3><p className={styles.organization}>{entry.organization}</p></div>
              </div>
              <p className={styles.period}><CalendarDays size={14} aria-hidden="true" />{formatJourneyPeriod(entry)}</p>
              {entry.description && <p className={styles.description}>{entry.description}</p>}
              {entry.tags.length > 0 && <ul className={styles.tags} aria-label="Compétences">{entry.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>}
              {(entry.project_id || entry.external_url) && <div className={styles.entryLinks}>
                {entry.project_id && <Link href={`/portfolio/${entry.project_id}`}>Voir le projet <ArrowUpRight size={15} aria-hidden="true" /></Link>}
                {entry.external_url && <a href={entry.external_url} target="_blank" rel="noopener noreferrer">En savoir plus <ArrowUpRight size={15} aria-hidden="true" /></a>}
              </div>}
            </article>
          </li>)}
        </ol> : <p className={styles.empty}>Aucune étape publiée dans cette catégorie pour le moment.</p>}
      </div>
    </section>
  );
}
