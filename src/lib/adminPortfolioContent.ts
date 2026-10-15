import "server-only";
import { scheduleAdminPublicRefresh } from "@/lib/adminPublicRefresh";
import { adminErrorResponse, requireAdminUser } from "@/lib/adminAuth";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { readRequestBody, RequestBodyError } from "@/lib/requestBody";
import { isSameOriginRequest } from "@/lib/sameOrigin";
import { ContentValidationError, UUID_PATTERN, validateJourneyInput, validateServiceInput } from "@/lib/portfolioContentValidation";
import { JOURNEY_PUBLIC_COLUMNS, SERVICE_PUBLIC_COLUMNS, SOCIAL_PUBLIC_COLUMNS } from "@/lib/portfolioContentFields";
import { validateSocialLink } from "@/lib/socialValidation";
import { createAdminRecord } from "@/lib/adminCreate";
import { adminReadErrorMessage } from "@/lib/adminReadError";

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const MAX_BODY_BYTES = 20_000;

export function createAdminContentHandlers(kind: "services" | "journey" | "social") {
  const table = kind === "services" ? "portfolio_services" : kind === "journey" ? "portfolio_journey" : "portfolio_social_links";
  const columns = kind === "services" ? SERVICE_PUBLIC_COLUMNS : kind === "journey" ? JOURNEY_PUBLIC_COLUMNS : SOCIAL_PUBLIC_COLUMNS;

  async function handle(request: Request) {
    try {
      if (request.method !== "GET" && !isSameOriginRequest(request)) return json({ ok: false, message: "Origine refusée." }, 403);
      // Le rôle est vérifié avant la lecture du corps et toute requête métier.
      await requireAdminUser();
      const supabase = createSupabaseAdmin();
      if (request.method === "GET") {
        const { data, error } = await supabase.from(table).select<string, Record<string, unknown>>(columns)
          .order("display_order", { ascending: true }).order("created_at", { ascending: true })
          .limit(250).abortSignal(AbortSignal.timeout(6000));
        if (error) {
          console.error("Admin content read unavailable:", table, error.code);
          return json({ ok: false, message: adminReadErrorMessage(error) }, 503);
        }
        return json({ ok: true, items: data ?? [] });
      }
      let body: unknown;
      try { body = JSON.parse(new TextDecoder().decode(await readRequestBody(request, MAX_BODY_BYTES))); }
      catch (error) { if (error instanceof RequestBodyError) throw error; throw new ContentValidationError("Corps JSON invalide."); }
      const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
      const id = input.id;
      if ((request.method !== "POST" || id !== undefined) && (typeof id !== "string" || !UUID_PATTERN.test(id))) throw new ContentValidationError("Identifiant invalide.");

      const values = request.method === "DELETE" ? null : kind === "services" ? validateServiceInput(input) : kind === "journey" ? validateJourneyInput(input) : validateSocialLink(input);
      const { data, error } = request.method === "POST"
        ? await createAdminRecord(supabase, table, { ...values, id: typeof id === "string" ? id : crypto.randomUUID() }, columns)
        : await (request.method === "DELETE" ? supabase.from(table).delete().eq("id", id) : supabase.from(table).update(values!).eq("id", id))
          .select<string, Record<string, unknown>>(columns).abortSignal(AbortSignal.timeout(6000)).maybeSingle();
      if (error) {
        console.error("Admin content write unavailable:", table, error.code);
        return json({ ok: false, message: error.code === "23503" ? "Le projet lié n'existe plus." : error.code === "ADMIN_CREATE_CONFLICT" ? error.message : "L'enregistrement n'a pas pu être confirmé. Votre formulaire est conservé." }, error.code === "23503" ? 400 : error.code === "ADMIN_CREATE_CONFLICT" ? 409 : 500);
      }
      if (!data) return json({ ok: false, message: "Cette entrée n'existe plus. Actualisez la liste." }, 404);
      return json({ ok: true, item: data, ...scheduleAdminPublicRefresh() }, request.method === "POST" ? 201 : 200);
    } catch (error) {
      if (error instanceof RequestBodyError) return json({ ok: false, message: error.message }, error.status);
      if (error instanceof ContentValidationError) return json({ ok: false, message: error.message }, 400);
      return adminErrorResponse(error);
    }
  }
  return { GET: handle, POST: handle, PATCH: handle, DELETE: handle };
}
