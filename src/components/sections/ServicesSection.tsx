"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Cloud, Code2, Database, Layers, Palette, ShieldCheck, X } from "lucide-react";
import type { PortfolioService } from "@/types";
import useDialogFocus from "@/hooks/useDialogFocus";
import styles from "./PortfolioContent.module.css";

const icons = { code: Code2, database: Database, layers: Layers, design: Palette, shield: ShieldCheck, cloud: Cloud };

export default function ServicesSection({ services }: { services: PortfolioService[] }) {
  const [selected, setSelected] = useState<PortfolioService | null>(null);
  const dialogRef = useDialogFocus(selected !== null, () => setSelected(null));
  const visible = services.filter((service) => service.published).sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id));
  if (!visible.length) return null;

  return (
    <section id="services" aria-labelledby="services-title" className={styles.section}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Ce que je propose</p>
        <h2 id="services-title" className={styles.title}>Mes services</h2>
        <p className={styles.subtitle}>Du premier écran aux données, des solutions adaptées à votre projet.</p>
      </div>
      <div className={styles.services}>
        {visible.map((service) => {
          const Icon = icons[service.icon] ?? Code2;
          return (
            <article key={service.id} data-accent={service.accent} className={`${styles.service} ${styles.accent}`}>
              <div className={styles.serviceIcon}><Icon size={30} aria-hidden="true" /></div>
              <h3 className={styles.serviceTitle}>{service.title}</h3>
              <p className={styles.serviceSummary}>{service.summary}</p>
              <button type="button" onClick={() => setSelected(service)} className={styles.details} aria-haspopup="dialog" aria-label={`Voir les détails : ${service.title}`}>
                Voir les détails <ArrowUpRight size={17} aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>
      {selected && (
        <div className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="service-dialog-title" aria-describedby="service-dialog-description" tabIndex={-1} data-accent={selected.accent} className={`${styles.dialog} ${styles.accent}`}>
            <button type="button" className={styles.close} onClick={() => setSelected(null)} aria-label="Fermer les détails du service"><X size={20} /></button>
            <h3 id="service-dialog-title">{selected.title}</h3>
            <p id="service-dialog-description" className={styles.description}>{selected.description}</p>
            <ul className={styles.bullets}>{selected.bullet_points.map((point, index) => <li key={`${index}-${point}`}><CheckCircle2 size={19} aria-hidden="true" /><span>{point}</span></li>)}</ul>
          </div>
        </div>
      )}
    </section>
  );
}
