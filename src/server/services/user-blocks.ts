import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseAdminConfigured } from "@/server/utils/env";

export type UserBlockResult = {
  ok: boolean;
  error?: string;
};

export async function listBlockedUserIds(): Promise<{
  ids: Set<string>;
  error?: string;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { ids: new Set() };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ids: new Set(), error: "Supabaseが未設定です。" };
  }

  const { data, error } = await admin.from("user_blocks").select("user_id");
  if (error) {
    return { ids: new Set(), error: error.message };
  }

  return {
    ids: new Set((data ?? []).map((row) => row.user_id as string)),
  };
}

export async function blockUser(
  userId: string,
  blockedBy: string | null,
  reason: string | null
): Promise<UserBlockResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: "Supabaseが未設定です。" };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: "Supabaseが未設定です。" };
  }

  const { error } = await admin.from("user_blocks").upsert({
    user_id: userId,
    blocked_by: blockedBy,
    reason,
    blocked_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function unblockUser(userId: string): Promise<UserBlockResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: "Supabaseが未設定です。" };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: "Supabaseが未設定です。" };
  }

  const { error } = await admin
    .from("user_blocks")
    .delete()
    .eq("user_id", userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error } = await admin
    .from("user_blocks")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.user_id);
}
