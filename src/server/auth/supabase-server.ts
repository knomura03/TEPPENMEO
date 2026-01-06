import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getEnv, isSupabaseConfigured } from "@/server/utils/env";

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;

  const env = getEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
