import { createSupabaseServerClient } from "@/server/auth/supabase-server";
import { isSupabaseConfigured } from "@/server/utils/env";

export type SessionUser = {
  id: string;
  email: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) {
    return { id: "mock-user", email: "mock@teppenmeo.local" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
