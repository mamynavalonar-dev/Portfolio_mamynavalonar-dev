"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, Variants } from "framer-motion";
import { Code, Award, Globe, FileText, ArrowUpRight } from "lucide-react";
import ProfileCard from "@/components/ui/ProfileCard";

/* ================== ANIMATION ================== */

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: 70, rotate: 2 },
  show: {
    opacity: 1,
    x: 0,
    rotate: 0,
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const pop: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 25 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.26,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

/* ================== COMPONENT ================== */

export default function About({
  initialProjectCount = 0,
  initialCertificateCount = 0,
}: {
  initialProjectCount?: number;
  initialCertificateCount?: number;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const reducedMotion = useReducedMotion();

  const projectCount = initialProjectCount;
  const certificateCount = initialCertificateCount;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);

    check();
    window.addEventListener("resize", check);

    return () => {
      window.removeEventListener("resize", check);
    };
  }, []);


  const scrollToPortfolio = () => {
    const el = document.getElementById("portfolio");
    if (el) el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  };

  const scrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  };

  const stats = [
    {
      icon: <Code size={16} />,
      value: String(projectCount),
      title: "PROJETS",
    },
    {
      icon: <Award size={16} />,
      value: String(certificateCount),
      title: "CERTIFICATS",
    },
    {
      icon: <Globe size={16} />,
      value: String(projectCount + certificateCount),
      title: "TRAVAUX RÉALISÉS",
    },
  ];

  return (
    <section
      id="about"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "flex-start",
        padding: isMobile ? "60px 24px 30px" : "80px 60px 30px 120px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* FOND STATIQUE : aucun shader WebGL pendant le défilement */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: "transparent",
        }}
      />

      <div style={{ width: "100%", position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "32px",
          }}
        >
          {/* LEFT */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, amount: 0.22, margin: "-60px" }}
            style={{
              maxWidth: "600px",
              width: "100%",
            }}
          >
            <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  letterSpacing: "0.2em",
                }}
              >
                À PROPOS DE MOI
              </span>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div
                style={{
                  fontSize: isMobile ? 32 : "clamp(32px,5vw,46px)",
                  fontWeight: 800,
                  lineHeight: 1.03,
                  color: "var(--text-primary)",
                }}
              >
                <div>RAKOTONIAINA</div>
                <div>Mamy Navalona Antonio</div>
              </div>
            </motion.div>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 40 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.3,
                    delay: 0.04,
                  },
                },
              }}
              style={{
                marginTop: 18,
                fontSize: 14,
                color: "rgba(255,255,255,0.76)",
                lineHeight: 1.75,
                maxWidth: isMobile ? "100%" : "490px",
              }}
            >
              Développeur Full Stack junior, je développe des applications web
              complètes en intervenant aussi bien sur les interfaces que sur la
              logique métier, les API et les données. Je privilégie des
              architectures claires, un code maintenable et des interfaces
              responsives, tout en intégrant la sécurité dès la conception :
              contrôle des accès, validation des données, protection des
              informations sensibles et bonnes pratiques côté serveur. Mon
              objectif est de construire des solutions fiables, performantes et
              évolutives, pensées pour répondre à des besoins réels.
            </motion.p>

            {/* QUOTE */}
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.94 },
                show: {
                  opacity: 1,
                  scale: 1,
                  transition: {
                    duration: 0.28,
                    delay: 0.06,
                  },
                },
              }}
              style={{
                marginTop: 18,
                padding: "12px 25px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                fontSize: 12,
                fontStyle: "italic",
                display: "inline-block",
                width: "fit-content",
              }}
            >
              « Transformer des besoins réels en solutions numériques fiables,
              intuitives, sécurisées et conçues pour durer. »
            </motion.div>

            {/* BUTTONS */}
            <motion.div
              variants={fadeUp}
              style={{
                display: "flex",
                gap: 10,
                marginTop: 18,
                flexWrap: "wrap",
              }}
            >
              {/* DOWNLOAD CV */}
              <a
                href="/api/cv/download"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "1px solid white",
                    background: "white",
                    color: "black",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "transform 0.25s ease, opacity 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform =
                      "translateY(-2px) scale(1.03)";
                    e.currentTarget.style.opacity = "0.92";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  <FileText size={14} />
                  Télécharger le CV
                </button>
              </a>

              {/* VIEW PROJECTS */}
              <button
                onClick={scrollToPortfolio}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "1px solid white",
                  background: "transparent",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "transform 0.25s ease, opacity 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform =
                    "translateY(-2px) scale(1.03)";
                  e.currentTarget.style.opacity = "0.85";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <ArrowUpRight size={14} />
                Voir les projets
              </button>
            </motion.div>
          </motion.div>

          {/* PROFILE CARD */}
          {!isMobile && (
            <motion.div
              variants={slideLeft}
              initial="hidden"
              whileInView="show"
              viewport={{ once: false, amount: 0.22 }}
              style={{
                width: "48%",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <ProfileCard
                avatarUrl="/assets/PP.webp"
                miniAvatarUrl="/assets/PP.webp"
                name="RAKOTONIAINA Mamy Navalona Antonio"
                title="Développeur Full Stack"
                handle="mamynavalonar-dev"
                status="Disponible"
                contactText="Me contacter"
                enableTilt
                behindGlowEnabled={false}
                onContactClick={scrollToContact}
              />
            </motion.div>
          )}
        </div>

        {/* CARDS */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, amount: 0.22 }}
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 18,
            marginTop: 36,
          }}
        >
          {stats.map((item, i) => (
            <motion.div
              key={i}
              variants={pop}
              whileHover={{ scale: 1.03 }}
              style={{
                position: "relative",
                padding: 18,
                borderRadius: 16,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                {item.icon}
              </div>

              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {item.value}
              </div>

              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                }}
              >
                {item.title}
              </div>

              <div
                onClick={scrollToPortfolio}
                style={{
                  position: "absolute",
                  bottom: 14,
                  right: 14,
                  cursor: "pointer",
                }}
              >
                <ArrowUpRight size={15} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
