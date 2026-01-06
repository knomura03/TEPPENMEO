import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { getEnv, isSupabaseConfigured } from "@/server/utils/env";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;
  if (!isSupabaseConfigured()) return null;

  const env = getEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_URL) {
    return null;
  }

  adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  return adminClient;
}
