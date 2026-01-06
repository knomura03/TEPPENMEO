import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockOrganization } from "@/server/services/mock-data";

export type Organization = {
  id: string;
  name: string;
};

type MembershipRow = {
  organizations: Organization | Organization[] | null;
};

export async function listOrganizationsForUser(
  userId: string
): Promise<Organization[]> {
  if (!isSupabaseConfigured()) {
    return [mockOrganization];
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("memberships")
    .select("organizations(id,name)")
    .eq("user_id", userId);

  if (error) return [];

  const organizations = (data ?? []).flatMap((row) => {
    const org = (row as MembershipRow).organizations;
    if (!org) return [];
    return Array.isArray(org) ? org : [org];
  });

  return organizations;
}

export async function getPrimaryOrganization(userId: string) {
  const orgs = await listOrganizationsForUser(userId);
  return orgs[0] ?? null;
}
