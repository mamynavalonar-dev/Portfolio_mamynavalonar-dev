import { adminErrorResponse, requireAdminUser } from "@/lib/adminAuth";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isSameOriginRequest } from "@/lib/sameOrigin";
import { readRequestBody, RequestBodyError } from "@/lib/requestBody";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const STATUSES = new Set(["new", "read", "replied", "archived"]);
const COLUMNS = "id,name,email,message,status,created_at";
const noStoreJson = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const status = new URL(request.url).searchParams.get("status");
    if (status && !STATUSES.has(status)) return noStoreJson({ ok: false, message: "Filtre invalide." }, 400);
    let query = createSupabaseAdmin().from("contact_messages").select(COLUMNS).order("created_at", { ascending: false }).limit(100);
    if (status) query = query.eq("status", status);
    const { data, error } = await query.abortSignal(AbortSignal.timeout(6000));
    if (error) {
      console.error("Admin contact messages read error:", error.code);
      return noStoreJson({ ok: false, message: "Impossible de charger les messages." }, 503);
    }
    return noStoreJson({ ok: true, messages: data ?? [] });
  } catch (error) { return adminErrorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return noStoreJson({ ok: false, message: "Origine refusée." }, 403);
    await requireAdminUser();
    let payload: unknown;
    try { payload = JSON.parse(new TextDecoder().decode(await readRequestBody(request, 2000))); }
    catch (error) {
      if (error instanceof RequestBodyError) throw error;
      return noStoreJson({ ok: false, message: "Requête invalide." }, 400);
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({ ok: false, message: "Mise à jour invalide." }, 400);
    const { id, status } = payload as Record<string, unknown>;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1 || typeof status !== "string" || !STATUSES.has(status)) return noStoreJson({ ok: false, message: "Mise à jour invalide." }, 400);
    const { data, error } = await createSupabaseAdmin().from("contact_messages").update({ status }).eq("id", id)
      .select(COLUMNS).abortSignal(AbortSignal.timeout(6000)).maybeSingle();
    if (error) {
      console.error("Admin contact message update error:", error.code);
      return noStoreJson({ ok: false, message: "La mise à jour n’a pas été confirmée. Actualisez la liste." }, 500);
    }
    if (!data) return noStoreJson({ ok: false, message: "Ce message n’existe plus. Actualisez la liste." }, 404);
    return noStoreJson({ ok: true, message: data });
  } catch (error) {
    if (error instanceof RequestBodyError) return noStoreJson({ ok: false, message: error.message }, error.status);
    return adminErrorResponse(error);
  }
}
