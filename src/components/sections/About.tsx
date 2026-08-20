"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion, Variants } from "framer-motion";
import { Code, Award, Globe, FileText, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ProfileCard from "@/components/ui/ProfileCard";
import GridScan from "@/components/ui/GridScan";

/* ================== ANIMATION ================== */

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.16,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 35, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 1,
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
      duration: 1.2,
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
      duration: 0.85,
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

  const [projectCount, setProjectCount] = useState(initialProjectCount);
  const [certificateCount, setCertificateCount] = useState(initialCertificateCount);

    const fetchStats = useCallback(async () => {
    try {
      const { count: projects } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true });

      const { count: certificates } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true });

      setProjectCount(projects || 0);
      setCertificateCount(certificates || 0);
    } catch {
      setProjectCount(0);
      setCertificateCount(0);
    }
  
  }, []);

useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);

    check();
    window.addEventListener("resize", check);

    const statsTimer = setTimeout(() => {
      void fetchStats();
    }, 0);

    return () => {
      clearTimeout(statsTimer);
      window.removeEventListener("resize", check);
    };
  }, [fetchStats]);


  const scrollToPortfolio = () => {
    const el = document.getElementById("portfolio");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
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
      {/* GRID SCAN BACKGROUND */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: isMobile ? "none" : "auto",
        }}
      >
        {!reducedMotion && <GridScan
          sensitivity={0.5}
          lineThickness={1}
          linesColor="#23262b"
          gridScale={0.08}
          scanColor="#ffffff"
          scanOpacity={0.28}
          scanSoftness={2.4}
          scanGlow={0.45}
          scanDuration={3.5}
          scanDelay={2.5}
          lineJitter={0.15}
        />}
      </div>

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
            viewport={{ once: false, margin: "-80px" }}
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
                    duration: 1.1,
                    delay: 0.2,
                  },
                },
              }}
              style={{
                marginTop: 18,
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.75,
                maxWidth: isMobile ? "100%" : "490px",
              }}
            >
              Développeur Full Stack junior passionné par la création
              d&apos;applications web modernes, fiables et responsives. Je
              développe des interfaces soignées et des fonctionnalités complètes
              en accordant une attention particulière à la qualité du code, à
              l&apos;expérience utilisateur et aux données.
            </motion.p>

            {/* QUOTE */}
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.94 },
                show: {
                  opacity: 1,
                  scale: 1,
                  transition: {
                    duration: 0.9,
                    delay: 0.3,
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
              « Transformer des idées en expériences numériques épurées,
              modernes et porteuses de sens. »
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
                href="https://drive.google.com/file/d/1cFqZ0TY0U0I51K0Tchv8E4sbOv5yAZ9x/view?usp=drive_link"
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
              viewport={{ once: false }}
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
                behindGlowEnabled
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
          viewport={{ once: false }}
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
