import { createSupabaseServerClient } from "@/server/auth/supabase-server";
import { isUserBlocked } from "@/server/services/user-blocks";
import { isSupabaseConfigured } from "@/server/utils/env";

export type SessionUser = {
  id: string;
  email: string | null;
  isBlocked: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) {
    return { id: "mock-user", email: "mock@teppenmeo.local", isBlocked: false };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const blocked = await isUserBlocked(data.user.id);
  return { id: data.user.id, email: data.user.email ?? null, isBlocked: blocked };
}

export async function getActiveSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.isBlocked) return null;
  return user;
}
