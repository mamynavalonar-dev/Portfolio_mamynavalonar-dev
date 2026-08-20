import { adminErrorResponse, requireAdminUser } from "@/lib/adminAuth";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set(["new", "read", "replied", "archived"]);

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  try {
    await requireAdminUser();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const supabaseAdmin = createSupabaseAdmin();

    let query = supabaseAdmin
      .from("contact_messages")
      .select("id,name,email,message,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (status && STATUSES.has(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Admin contact messages read error:", error.message);
      return noStoreJson(
        { ok: false, message: "Impossible de charger les messages." },
        500,
      );
    }

    return noStoreJson({ ok: true, messages: data ?? [] });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();

    const payload = (await request.json()) as {
      id?: unknown;
      status?: unknown;
    };
    const id =
      typeof payload.id === "number" && Number.isSafeInteger(payload.id)
        ? payload.id
        : null;
    const status =
      typeof payload.status === "string" && STATUSES.has(payload.status)
        ? payload.status
        : null;

    if (!id || !status) {
      return noStoreJson(
        { ok: false, message: "Mise à jour invalide." },
        400,
      );
    }

    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("contact_messages")
      .update({ status })
      .eq("id", id)
      .select("id,name,email,message,status,created_at")
      .single();

    if (error) {
      console.error("Admin contact message update error:", error.message);
      return noStoreJson(
        { ok: false, message: "Impossible de mettre à jour le message." },
        500,
      );
    }

    return noStoreJson({ ok: true, message: data });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return noStoreJson({ ok: false, message: "Requête invalide." }, 400);
    }

    return adminErrorResponse(error);
  }
}
