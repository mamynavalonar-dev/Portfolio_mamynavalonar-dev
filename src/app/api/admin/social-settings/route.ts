import { scheduleAdminPublicRefresh } from "@/lib/adminPublicRefresh";
import { requireAdminUser, adminErrorResponse } from "@/lib/adminAuth";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isSameOriginRequest } from "@/lib/sameOrigin";
import { readRequestBody, RequestBodyError } from "@/lib/requestBody";
import { ContentValidationError } from "@/lib/portfolioContentValidation";
import { validateSocialSettings } from "@/lib/socialValidation";
import { DEFAULT_SOCIAL_CONTENT } from "@/lib/socialDefaults";
import { adminReadErrorMessage } from "@/lib/adminReadError";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  try {
    await requireAdminUser();
    const { data, error } = await createSupabaseAdmin().from("portfolio_social_settings").select("heading,introduction").eq("id", 1).abortSignal(AbortSignal.timeout(6000)).maybeSingle();
    if (error) return json({ ok: false, message: adminReadErrorMessage(error) }, 503);
    return json({ ok: true, settings: data ?? DEFAULT_SOCIAL_CONTENT.settings });
  } catch (error) { return adminErrorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return json({ ok: false, message: "Origine refusée." }, 403);
    await requireAdminUser();
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(await readRequestBody(request, 4000))); }
    catch (error) { if (error instanceof RequestBodyError) throw error; throw new ContentValidationError("Corps JSON invalide."); }
    const values = validateSocialSettings(body);
    const { data, error } = await createSupabaseAdmin().from("portfolio_social_settings").upsert({ id: 1, ...values }, { onConflict: "id" }).select("heading,introduction").abortSignal(AbortSignal.timeout(6000)).maybeSingle();
    if (error || !data) return json({ ok: false, message: "L’enregistrement n’a pas été confirmé. Votre texte est conservé." }, 500);
    return json({ ok: true, settings: data, ...scheduleAdminPublicRefresh() });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ ok: false, message: error.message }, error.status);
    if (error instanceof ContentValidationError) return json({ ok: false, message: error.message }, 400);
    return adminErrorResponse(error);
  }
}
