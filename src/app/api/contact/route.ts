import { createHmac } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isValidEmail,
  normalizeContactString,
} from "@/lib/contactValidation";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20_000;

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
    const rawBody = await request.text();

    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json(
        {
          ok: false,
          message: "Requête trop volumineuse.",
        },
        413,
      );
    }

    const parsed = JSON.parse(rawBody) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new SyntaxError("Invalid JSON object");
    }

    payload = parsed as ContactPayload;
  } catch {
    return json(
      {
        ok: false,
        message: "Requête invalide.",
      },
      400,
    );
  }

  const name = normalizeContactString(payload.name);
  const email = normalizeContactString(payload.email).toLowerCase();
  const message = normalizeContactString(payload.message);
  const website = normalizeContactString(payload.website);

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

  const serverSecret =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rateLimitSecret =
    process.env.CONTACT_RATE_LIMIT_SECRET ?? serverSecret;

  if (!serverSecret || !rateLimitSecret) {
    console.error(
      "Contact API: variables Supabase serveur manquantes.",
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
  const ipHash = createHmac("sha256", rateLimitSecret)
    .update(ip)
    .digest("hex");

  let supabaseAdmin;

  try {
    supabaseAdmin = createSupabaseAdmin();
  } catch (error) {
    console.error("Contact API configuration error:", error);
    return json(
      {
        ok: false,
        message: "Le service de contact n'est pas configuré.",
      },
      503,
    );
  }

  // La fonction SQL verrouille le hash puis compte et insère dans une même
  // transaction : deux requêtes simultanées ne contournent plus la limite.
  const { error } = await supabaseAdmin.rpc("submit_contact_message", {
    p_email: email,
    p_ip_hash: ipHash,
    p_message: message,
    p_name: name,
  });

  if (error) {
    if (error.message.includes("CONTACT_RATE_LIMIT")) {
      return json(
        {
          ok: false,
          message:
            "Trop de messages envoyés récemment. Réessayez dans quelques minutes.",
        },
        429,
      );
    }

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
