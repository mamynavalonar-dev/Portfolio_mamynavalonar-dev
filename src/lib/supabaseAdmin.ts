import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecret) {
    throw new Error("Configuration Supabase serveur manquante.");
  }

  return createClient(supabaseUrl, supabaseSecret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
