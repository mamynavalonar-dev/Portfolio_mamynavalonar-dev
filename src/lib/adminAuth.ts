import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServer } from "@/lib/supabaseServer";

export class AdminAccessError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 503,
  ) {
    super(message);
  }
}

export async function requireAdminUser(): Promise<User> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AdminAccessError("Authentification requise.", 401);
  }

  let adminClient;

  try {
    adminClient = createSupabaseAdmin();
  } catch {
    throw new AdminAccessError(
      "Le contrôle administrateur n'est pas configuré.",
      503,
    );
  }

  const { data: admin, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Admin authorization error:", adminError.message);
    throw new AdminAccessError(
      "Le contrôle administrateur est indisponible.",
      503,
    );
  }

  if (!admin) {
    throw new AdminAccessError("Accès administrateur refusé.", 403);
  }

  return user;
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminAccessError) {
    return Response.json(
      { ok: false, message: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("Unexpected admin API error:", error);
  return Response.json(
    { ok: false, message: "Erreur interne du serveur." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
