import { createHmac } from "node:crypto";
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
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
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
