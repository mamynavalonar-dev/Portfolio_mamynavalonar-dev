"use client";

import { motion } from "framer-motion";
import ContactForm from "./ContactForm";
import CommentsSection from "./CommentsSection";

const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const viewport = {
  once: false,
  amount: 0.18,
  margin: "-40px",
};

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="w-full max-w-[1500px] mx-auto
      px-5 sm:px-6 md:px-10 lg:px-20
      pt-20 sm:pt-24 lg:pt-28
      pb-24 sm:pb-28 lg:pb-36
      text-white"
    >
      <motion.div
        initial={{ opacity: 0, y: 42, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={viewport}
        transition={{
          duration: 0.38,
          ease: smoothEase,
        }}
        className="text-center mb-12 sm:mb-14 lg:mb-16"
      >
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{
            duration: 0.32,
            ease: smoothEase,
          }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4"
        >
          Contact
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{
            duration: 0.34,
            delay: 0.04,
            ease: smoothEase,
          }}
          className="text-white/72 text-sm sm:text-base max-w-xl sm:max-w-2xl mx-auto leading-relaxed"
        >
          Un projet, une opportunité ou une collaboration en tête ? Contactez-moi pour échanger sur vos besoins et voir comment je peux contribuer à leur réalisation.
        </motion.p>
      </motion.div>

      <div
        className="
        grid
        grid-cols-1
        md:grid-cols-1
        lg:grid-cols-[420px_1fr]
        gap-6 sm:gap-8 md:gap-10 lg:gap-12
      "
      >
        <motion.div
          initial={{ opacity: 0, x: -42, y: 18 }}
          whileInView={{ opacity: 1, x: 0, y: 0 }}
          viewport={viewport}
          transition={{
            duration: 0.4,
            ease: smoothEase,
          }}
          className="w-full"
        >
          <ContactForm />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 42, y: 18 }}
          whileInView={{ opacity: 1, x: 0, y: 0 }}
          viewport={viewport}
          transition={{
            duration: 0.4,
            delay: 0.05,
            ease: smoothEase,
          }}
          className="w-full"
        >
          <CommentsSection />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.6 }}
        transition={{
          duration: 0.3,
          ease: smoothEase,
        }}
        className="mt-20 text-center text-xs text-white/45"
      >
        © 2026 RAKOTONIAINA Mamy Navalona Antonio — Tous droits réservés.
      </motion.div>
    </section>
  );
}
