"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  motion,
  Variants } from "framer-motion";
import { Send,
  User,
  Mail,
  MessageSquare,
  ArrowUpRight } from "lucide-react";

import {
  FaLinkedinIn,
  FaInstagram,
  FaGithub,
  FaWhatsapp,
} from "react-icons/fa";

const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fieldVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 26,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: smoothEase,
    },
  },
};

const socialLinks = [
  {
    title: "Instagram",
    user: "@m1ke_tys.0n",
    icon: FaInstagram,
    link: "https://www.instagram.com/m1ke_tys.0n",
  },
  {
    title: "GitHub",
    user: "@mamynavalonar-dev",
    icon: FaGithub,
    link: "https://github.com/mamynavalonar-dev",
  },
  {
    title: "WhatsApp",
    user: "Me contacter",
    icon: FaWhatsapp,
    link: "https://wa.me/qr/CQDLCROVEAG3O1",
  },
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    setFeedback(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
          website,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.message || "Impossible d'envoyer le message pour le moment.",
        );
      }

      setName("");
      setEmail("");
      setMessage("");
      setWebsite("");
      setFeedback({
        type: "success",
        message: "Message envoyé avec succès. Merci pour votre message.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'envoyer le message pour le moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: smoothEase }}
      viewport={{ once: false, amount: 0.2 }}
      className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 md:p-8 flex flex-col h-full"
    >
      {/* HEADER */}
      <motion.div
        variants={fieldVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false }}
        transition={{ delay: 0.05 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Contactez-moi</h2>

        <p className="text-sm text-white/50 mb-7">
          N&apos;hésitez pas à me contacter si vous souhaitez collaborer,
          échanger des idées, ou simplement dire bonjour.
        </p>
      </motion.div>

      {/* FORM */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Honeypot anti-bot : invisible pour un utilisateur normal */}
        <div
          className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor="contact-website">Site web</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* NAME */}
        <motion.div
          variants={fieldVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative">
            <User
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />

            <input
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Votre nom"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              disabled={submitting}
              className="w-full rounded-2xl border border-white/15 bg-black/20 pl-12 pr-4 py-4 outline-none transition duration-200 focus:border-white focus:ring-1 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </motion.div>

        {/* EMAIL */}
        <motion.div
          variants={fieldVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false }}
          transition={{ delay: 0.16 }}
        >
          <div className="relative">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />

            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Votre email"
              autoComplete="email"
              required
              maxLength={254}
              disabled={submitting}
              className="w-full rounded-2xl border border-white/15 bg-black/20 pl-12 pr-4 py-4 outline-none transition duration-200 focus:border-white focus:ring-1 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </motion.div>

        {/* MESSAGE */}
        <motion.div
          variants={fieldVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false }}
          transition={{ delay: 0.22 }}
        >
          <div className="relative">
            <MessageSquare
              className="absolute left-4 top-5 text-white/40"
              aria-hidden="true"
            />

            <textarea
              name="message"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Votre message"
              required
              minLength={10}
              maxLength={5000}
              disabled={submitting}
              className="w-full rounded-2xl border border-white/15 bg-black/20 pl-12 pr-4 py-4 outline-none resize-none transition duration-200 focus:border-white focus:ring-1 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </motion.div>

        {feedback && (
          <p
            role="status"
            aria-live="polite"
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : "border-red-400/20 bg-red-400/10 text-red-200"
            }`}
          >
            {feedback.message}
          </p>
        )}

        {/* BUTTON */}
        <motion.button
          type="submit"
          disabled={submitting}
          variants={fieldVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false }}
          transition={{ delay: 0.28 }}
          whileHover={
            submitting
              ? undefined
              : {
                  scale: 1.06,
                  transition: { duration: 0.12 },
                }
          }
          whileTap={submitting ? undefined : { scale: 0.97 }}
          className="w-full rounded-2xl py-4 bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={16} aria-hidden="true" />
          {submitting ? "Envoi en cours..." : "Envoyer le message"}
        </motion.button>
      </form>

      {/* SOCIAL */}
      <div className="border-t border-white/10 pt-5 mt-6">
        <motion.p
          variants={fieldVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false }}
          transition={{ delay: 0.34 }}
          className="text-sm text-white/55 mb-4"
        >
          Retrouvez-moi
        </motion.p>

        {/* LINKEDIN */}
        <motion.a
          href="https://www.linkedin.com/in/mamy-navalona-antonio-rakotoniaina-6aa98820a"
          target="_blank"
          rel="noopener noreferrer"
          variants={fieldVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false }}
          transition={{ delay: 0.36 }}
          whileHover={{
            scale: 1.05,
            transition: { duration: 0.12 },
          }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4 mb-3 flex items-center justify-between"
        >
          <div className="absolute inset-0 bg-white/[0.04] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 ease-out" />

          <div className="relative z-10 flex items-center gap-3">
            <FaLinkedinIn />

            <div>
              <p className="text-sm font-medium">LinkedIn</p>
              <p className="text-xs text-white/35">Mamy Navalona Antonio</p>
            </div>
          </div>

          <div className="relative z-10 opacity-0 group-hover:opacity-100 transition">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <ArrowUpRight size={14} />
            </div>
          </div>
        </motion.a>

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {socialLinks.map((item, i) => {
            const Icon = item.icon;

            return (
              <motion.a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                variants={fieldVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: false }}
                transition={{
                  delay: 0.42 + i * 0.05,
                }}
                whileHover={{
                  scale: 1.06,
                  transition: { duration: 0.12 },
                }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3 flex items-center justify-between"
              >
                <div className="absolute inset-0 bg-white/[0.04] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 ease-out" />

                <div className="relative z-10 flex items-center gap-3">
                  <Icon />

                  <div>
                    <p className="text-sm">{item.title}</p>
                    <p className="text-[11px] text-white/35">{item.user}</p>
                  </div>
                </div>

                <div className="relative z-10 opacity-0 group-hover:opacity-100 transition">
                  <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                    <ArrowUpRight size={12} />
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
