import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { visitorIdentity } from "@/lib/requestIdentity";
import {
  PublicRequestLimitError,
  publicRequestLimitResponse,
  reservePublicRequest,
} from "@/lib/publicRequestLimit";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const commentId = Number(rawId);

  if (!Number.isSafeInteger(commentId) || commentId < 1) {
    return Response.json(
      { ok: false, message: "Commentaire invalide." },
      { status: 400 },
    );
  }

  try {
    const identity = visitorIdentity(request);
    const supabaseAdmin = createSupabaseAdmin();
    await reservePublicRequest(supabaseAdmin, request, "like");
    const { data, error } = await supabaseAdmin.rpc("like_comment_once", {
      p_client_hash: identity.clientHash,
      p_comment_id: commentId,
    });

    if (error) throw error;

    const response = Response.json(
      { ok: true, likes: Number(data ?? 0) },
      { headers: { "Cache-Control": "no-store" } },
    );

    if (identity.cookie) response.headers.append("Set-Cookie", identity.cookie);
    return response;
  } catch (error) {
    if (error instanceof PublicRequestLimitError) return publicRequestLimitResponse();
    console.error("Comment like error:", error);
    return Response.json(
      { ok: false, message: "Impossible d'ajouter ce j'aime." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
