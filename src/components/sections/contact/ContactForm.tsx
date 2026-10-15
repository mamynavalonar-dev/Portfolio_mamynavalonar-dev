"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  motion,
  Variants } from "framer-motion";
import { Send,
  User,
  Mail,
  MessageSquare } from "lucide-react";

import type { SocialContent } from "@/types";
import { DEFAULT_SOCIAL_CONTENT } from "@/lib/socialDefaults";
import SocialLinks from "./SocialLinks";

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
      duration: 0.22,
      ease: smoothEase,
    },
  },
};

export default function ContactForm({ social = DEFAULT_SOCIAL_CONTENT }: { social?: SocialContent }) {
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
      initial={false}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: smoothEase }}
      viewport={{ once: true, amount: 0.2 }}
      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-8 flex flex-col h-full"
    >
      {/* HEADER */}
      <motion.div
        variants={fieldVariants}
        initial={false}
        whileInView="show"
        viewport={{ once: true }}
        transition={{ delay: 0.05 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Contactez-moi</h2>

        <p className="text-sm text-white/50 mb-7">
          N&apos;hésitez pas à me contacter si vous souhaitez collaborer,
          échanger des idées, ou simplement dire bonjour. Ce message privé est destiné à Mamy Navalona Antonio et ne sera pas affiché parmi les commentaires.
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
          initial={false}
          whileInView="show"
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <label htmlFor="contact-name" className="sr-only">
            Votre nom
          </label>
          <div className="relative">
            <User
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />

            <input
              id="contact-name"
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
          initial={false}
          whileInView="show"
          viewport={{ once: true }}
          transition={{ delay: 0.16 }}
        >
          <label htmlFor="contact-email" className="sr-only">
            Votre adresse e-mail
          </label>
          <div className="relative">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />

            <input
              id="contact-email"
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
          initial={false}
          whileInView="show"
          viewport={{ once: true }}
          transition={{ delay: 0.22 }}
        >
          <label htmlFor="contact-message" className="sr-only">
            Votre message
          </label>
          <div className="relative">
            <MessageSquare
              className="absolute left-4 top-5 text-white/40"
              aria-hidden="true"
            />

            <textarea
              id="contact-message"
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
          initial={false}
          whileInView="show"
          viewport={{ once: true }}
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

      <SocialLinks content={social} />
    </motion.div>
  );
}
