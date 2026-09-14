import "server-only";

import type { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requestIpHash } from "@/lib/requestIdentity";

export class PublicRequestLimitError extends Error {}

export async function reservePublicRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  request: Request,
  action: "comment" | "like",
) {
  const { error } = await supabase.rpc("reserve_public_request", {
    p_action: action,
    p_ip_hash: requestIpHash(request),
  });

  if (error?.message.includes("PUBLIC_REQUEST_RATE_LIMIT")) {
    throw new PublicRequestLimitError("Trop de demandes. Réessayez plus tard.");
  }

  if (error) throw error;
}

export function publicRequestLimitResponse() {
  return Response.json(
    { ok: false, message: "Trop de demandes. Réessayez dans quelques minutes." },
    {
      status: 429,
      headers: { "Cache-Control": "no-store", "Retry-After": "900" },
    },
  );
}
