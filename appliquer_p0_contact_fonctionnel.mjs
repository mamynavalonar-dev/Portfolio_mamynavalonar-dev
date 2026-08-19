import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(
  path.dirname(root),
  "correctif_backups_portfolio",
  `p0-contact-${stamp}`,
);

const contactRel = "src/components/sections/contact/ContactForm.tsx";
const routeRel = "src/app/api/contact/route.ts";
const sqlRel = "supabase_contact_messages.sql";

const contactPath = path.join(root, contactRel);
const routePath = path.join(root, routeRel);
const sqlPath = path.join(root, sqlRel);

function fail(message) {
  console.error(`\nERREUR : ${message}`);
  console.error("Aucune modification n'a été écrite.");
  process.exit(1);
}

function backup(rel, content) {
  const dest = path.join(backupRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, "utf8");
}

if (!fs.existsSync(contactPath)) {
  fail(`${contactRel} introuvable`);
}

const originalContact = fs.readFileSync(contactPath, "utf8");
let contact = originalContact;

/* ---------------------------------------------------------
   Imports React
--------------------------------------------------------- */
if (!contact.includes('import { useState } from "react";')) {
  const clientMarker = `"use client";`;
  if (!contact.includes(clientMarker)) {
    fail(`directive "use client" introuvable dans ContactForm.tsx`);
  }

  contact = contact.replace(
    clientMarker,
    `${clientMarker}

import { useState } from "react";
import type { FormEvent } from "react";`,
  );
}

/* ---------------------------------------------------------
   Etat + submit
--------------------------------------------------------- */
const functionMarker = `export default function ContactForm() {
  return (`;

const functionReplacement = `export default function ContactForm() {
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

  return (`;

if (!contact.includes("const handleSubmit = async")) {
  if (!contact.includes(functionMarker)) {
    fail("point d'insertion handleSubmit introuvable dans ContactForm.tsx");
  }
  contact = contact.replace(functionMarker, functionReplacement);
}

/* ---------------------------------------------------------
   Remplacement de la zone FORM uniquement.
   On laisse toute la zone SOCIAL intacte afin de conserver
   les liens d'identité déjà corrigés localement.
--------------------------------------------------------- */
const formMarker = `      {/* FORM */}`;
const socialMarker = `      {/* SOCIAL */}`;

const formStart = contact.indexOf(formMarker);
const socialStart = contact.indexOf(socialMarker);

if (formStart === -1 || socialStart === -1 || socialStart <= formStart) {
  fail("bornes FORM/SOCIAL introuvables dans ContactForm.tsx");
}

const formBlock = `      {/* FORM */}
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
            className={\`rounded-xl border px-4 py-3 text-sm \${
              feedback.type === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : "border-red-400/20 bg-red-400/10 text-red-200"
            }\`}
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

`;

contact =
  contact.slice(0, formStart) +
  formBlock +
  contact.slice(socialStart);

/* ---------------------------------------------------------
   Route API Next.js
--------------------------------------------------------- */
const route = `import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  website?: unknown;
};

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || "0");

  if (contentLength > MAX_BODY_BYTES) {
    return json(
      {
        ok: false,
        message: "Requête trop volumineuse.",
      },
      413,
    );
  }

  let payload: ContactPayload;

  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return json(
      {
        ok: false,
        message: "Requête invalide.",
      },
      400,
    );
  }

  const name = normalizeString(payload.name);
  const email = normalizeString(payload.email).toLowerCase();
  const message = normalizeString(payload.message);
  const website = normalizeString(payload.website);

  // Honeypot : on répond comme si tout s'était bien passé,
  // sans écrire en base.
  if (website) {
    return json({
      ok: true,
      message: "Message envoyé.",
    });
  }

  if (name.length < 2 || name.length > 100) {
    return json(
      {
        ok: false,
        message: "Le nom doit contenir entre 2 et 100 caractères.",
      },
      400,
    );
  }

  if (email.length > 254 || !isValidEmail(email)) {
    return json(
      {
        ok: false,
        message: "Adresse email invalide.",
      },
      400,
    );
  }

  if (message.length < 10 || message.length > 5000) {
    return json(
      {
        ok: false,
        message: "Le message doit contenir entre 10 et 5000 caractères.",
      },
      400,
    );
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Préférer la nouvelle Secret key sb_secret_...
  // Fallback temporaire pour les anciens projets Supabase.
  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecret) {
    console.error(
      "Contact API: variables SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY manquantes.",
    );

    return json(
      {
        ok: false,
        message: "Le service de contact n'est pas configuré.",
      },
      503,
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  // HMAC : l'IP brute n'est jamais enregistrée dans la base.
  const ipHash = createHmac("sha256", supabaseSecret)
    .update(ip)
    .digest("hex");

  const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseSecret,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  const since = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MS,
  ).toISOString();

  const { count, error: rateError } = await supabaseAdmin
    .from("contact_messages")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if (rateError) {
    console.error("Contact API rate-limit error:", rateError.message);

    return json(
      {
        ok: false,
        message: "Le service de contact est momentanément indisponible.",
      },
      503,
    );
  }

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return json(
      {
        ok: false,
        message:
          "Trop de messages envoyés récemment. Réessayez dans quelques minutes.",
      },
      429,
    );
  }

  const { error } = await supabaseAdmin
    .from("contact_messages")
    .insert({
      name,
      email,
      message,
      ip_hash: ipHash,
      status: "new",
    });

  if (error) {
    console.error("Contact API insert error:", error.message);

    return json(
      {
        ok: false,
        message: "Impossible d'envoyer le message pour le moment.",
      },
      500,
    );
  }

  return json(
    {
      ok: true,
      message: "Message envoyé avec succès.",
    },
    201,
  );
}
`;

/* ---------------------------------------------------------
   SQL Supabase
--------------------------------------------------------- */
const sql = `-- ============================================================
-- P0 CONTACT - TABLE PRIVEE DE MESSAGES
-- A exécuter dans Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name text NOT NULL
        CHECK (char_length(name) BETWEEN 2 AND 100),
    email text NOT NULL
        CHECK (char_length(email) BETWEEN 3 AND 254),
    message text NOT NULL
        CHECK (char_length(message) BETWEEN 10 AND 5000),
    ip_hash text NOT NULL,
    status text NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'read', 'replied', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
ON public.contact_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_ip_created_at
ON public.contact_messages(ip_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_email_created_at
ON public.contact_messages(email, created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Le navigateur ne doit avoir AUCUN accès direct à cette table.
REVOKE ALL ON TABLE public.contact_messages FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.contact_messages_id_seq FROM anon, authenticated;

-- Le backend Next.js utilise une Supabase Secret key / service role.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.contact_messages
TO service_role;

GRANT USAGE, SELECT
ON SEQUENCE public.contact_messages_id_seq
TO service_role;

-- Aucun CREATE POLICY volontairement :
-- anon/authenticated ne peuvent ni lire ni insérer directement.
`;

/* ---------------------------------------------------------
   Validation avant écriture
--------------------------------------------------------- */
if (!contact.includes("<form") || !contact.includes("onSubmit={handleSubmit}")) {
  fail("contrôle final du formulaire échoué");
}

if (!route.includes('export async function POST(request: Request)')) {
  fail("contrôle final route API échoué");
}

if (!sql.includes("ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;")) {
  fail("contrôle final SQL/RLS échoué");
}

/* ---------------------------------------------------------
   Sauvegardes hors projet
--------------------------------------------------------- */
backup(contactRel, originalContact);

if (fs.existsSync(routePath)) {
  backup(routeRel, fs.readFileSync(routePath, "utf8"));
}

if (fs.existsSync(sqlPath)) {
  backup(sqlRel, fs.readFileSync(sqlPath, "utf8"));
}

/* ---------------------------------------------------------
   Ecriture
--------------------------------------------------------- */
fs.mkdirSync(path.dirname(routePath), { recursive: true });

fs.writeFileSync(contactPath, contact, "utf8");
fs.writeFileSync(routePath, route, "utf8");
fs.writeFileSync(sqlPath, sql, "utf8");

console.log("");
console.log("P0 CONTACT APPLIQUE AVEC SUCCES.");
console.log(`Sauvegarde hors projet : ${backupRoot}`);
console.log("");
console.log("Fichiers :");
console.log(`- modifié : ${contactRel}`);
console.log(`- créé   : ${routeRel}`);
console.log(`- créé   : ${sqlRel}`);
console.log("");
console.log("Sécurité intégrée :");
console.log("- validation serveur");
console.log("- honeypot anti-bot");
console.log("- limite 3 messages / 15 min / IP hachée");
console.log("- aucune IP brute stockée");
console.log("- table inaccessible directement à anon/authenticated");
console.log("- Secret key utilisée uniquement dans la route serveur");
console.log("");
console.log("IMPORTANT : avant de tester le formulaire :");
console.log("1. Exécuter supabase_contact_messages.sql dans Supabase SQL Editor");
console.log("2. Ajouter SUPABASE_SECRET_KEY dans .env.local");
console.log("3. Ajouter la même variable dans Vercel");
console.log("");
console.log("Puis :");
console.log("pnpm build");
console.log("pnpm lint");
