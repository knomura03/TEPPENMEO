import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";

export type MembershipRole = "owner" | "admin" | "member" | "viewer";

const rolePriority: Record<MembershipRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
  viewer: 0,
};

export async function isSystemAdmin(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error } = await admin
    .from("system_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.user_id);
}

export async function getMembershipRole(
  userId: string,
  organizationId: string
): Promise<MembershipRole | null> {
  if (!isSupabaseConfigured()) return "owner";
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) return null;
  return (data?.role as MembershipRole | null) ?? null;
}

export function hasRequiredRole(
  role: MembershipRole | null,
  required: MembershipRole
): boolean {
  if (!role) return false;
  return rolePriority[role] >= rolePriority[required];
}
