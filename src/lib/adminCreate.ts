import type { SupabaseClient } from "@supabase/supabase-js";
import { samePublicValue } from "@/lib/publicRecords";

/** Retry a UUID-backed creation without overwriting an existing entry. */
export async function createAdminRecord(
  client: SupabaseClient,
  table: "projects" | "portfolio_services" | "portfolio_journey" | "portfolio_social_links",
  values: Record<string, unknown> & { id: string },
  columns: string,
  signal = AbortSignal.timeout(6000),
) {
  const result = await client.from(table).insert(values)
    .select<string, Record<string, unknown>>(columns).abortSignal(signal).maybeSingle();
  if (result.error?.code !== "23505") return result;

  // A lost response may have hidden a successful INSERT. A duplicate UUID is
  // acknowledged only when every submitted field matches the saved record.
  const existing = await client.from(table).select<string, Record<string, unknown>>(columns)
    .eq("id", values.id).abortSignal(signal).maybeSingle();
  if (existing.error) return existing;
  const saved = existing.data;
  if (!saved) return result;
  if (Object.keys(values).every((key) => samePublicValue(values[key], saved[key]))) return existing;
  return {
    data: null,
    error: { code: "ADMIN_CREATE_CONFLICT", message: "Cette entrée existe déjà avec d’autres valeurs. Actualisez la liste avant de la modifier." },
  };
}
