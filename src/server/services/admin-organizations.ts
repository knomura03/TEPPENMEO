import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { MembershipRole } from "@/server/auth/rbac";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockAdminUsers, mockMemberships, mockOrganization } from "@/server/services/mock-data";
import { getUserEmailById } from "@/server/services/admin-users";

export type AdminOrganization = {
  id: string;
  name: string;
  memberCount: number;
};

export type OrganizationMember = {
  userId: string;
  email: string | null;
  role: MembershipRole;
  createdAt: string | null;
};

export async function listAdminOrganizations(): Promise<AdminOrganization[]> {
  if (!isSupabaseConfigured()) {
    const memberCount = mockMemberships.filter(
      (member) => member.organizationId === mockOrganization.id
    ).length;
    return [
      {
        id: mockOrganization.id,
        name: mockOrganization.name,
        memberCount,
      },
    ];
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin.from("organizations").select("id,name");
  if (error || !data) return [];

  const memberships = await admin.from("memberships").select("organization_id");
  const counts = new Map<string, number>();
  (memberships.data ?? []).forEach((row) => {
    const orgId = row.organization_id as string;
    counts.set(orgId, (counts.get(orgId) ?? 0) + 1);
  });

  return (data ?? []).map((org) => ({
    id: org.id,
    name: org.name,
    memberCount: counts.get(org.id) ?? 0,
  }));
}

export async function getAdminOrganizationById(
  organizationId: string
): Promise<{ id: string; name: string } | null> {
  if (!isSupabaseConfigured()) {
    return organizationId === mockOrganization.id
      ? { id: mockOrganization.id, name: mockOrganization.name }
      : null;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("organizations")
    .select("id,name")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, name: data.name };
}

export async function listOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  if (!isSupabaseConfigured()) {
    return mockMemberships
      .filter((member) => member.organizationId === organizationId)
      .map((member) => ({
        userId: member.userId,
        email: mockAdminUsers.find((user) => user.id === member.userId)?.email ?? null,
        role: member.role as MembershipRole,
        createdAt: new Date().toISOString(),
      }));
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("memberships")
    .select("user_id, role, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const members = await Promise.all(
    (data ?? []).map(async (row) => ({
      userId: row.user_id as string,
      email: await getUserEmailById(row.user_id as string),
      role: row.role as MembershipRole,
      createdAt: row.created_at as string,
    }))
  );

  return members;
}

export async function addOrganizationMember(input: {
  organizationId: string;
  userId: string;
  role: MembershipRole;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin
    .from("memberships")
    .upsert(
      {
        organization_id: input.organizationId,
        user_id: input.userId,
        role: input.role,
      },
      { onConflict: "organization_id,user_id" }
    );

  return !error;
}

export async function updateOrganizationMemberRole(input: {
  organizationId: string;
  userId: string;
  role: MembershipRole;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin
    .from("memberships")
    .update({ role: input.role })
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId);

  return !error;
}

export async function removeOrganizationMember(input: {
  organizationId: string;
  userId: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin
    .from("memberships")
    .delete()
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId);

  return !error;
}
