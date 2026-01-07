import crypto from "crypto";

import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { listBlockedUserIds } from "@/server/services/user-blocks";
import { getEnv, isSupabaseConfigured } from "@/server/utils/env";
import { mockAdminUsers, mockMemberships } from "@/server/services/mock-data";

export type AdminUserStatus = "active" | "invited" | "disabled";

export type AdminUser = {
  id: string;
  email: string | null;
  createdAt: string | null;
  invitedAt: string | null;
  lastSignInAt: string | null;
  membershipCount: number;
  isSystemAdmin: boolean;
  isDisabled: boolean;
  status: AdminUserStatus;
};

export type CreateUserResult = {
  userId: string;
  email: string;
  tempPassword?: string;
  invited: boolean;
};

export type InviteLinkResult = {
  userId: string;
  email: string;
  inviteLink: string;
};

export type AdminUserFilters = {
  query?: string | null;
  status?: AdminUserStatus | "all" | null;
  organizationId?: string | null;
};

const DEFAULT_BAN_DURATION = "87600h";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function generateTempPassword() {
  return `Temp-${crypto.randomBytes(12).toString("base64url")}`;
}

export function deriveAdminUserStatus(input: {
  isDisabled: boolean;
  invitedAt: string | null;
  lastSignInAt: string | null;
}): AdminUserStatus {
  if (input.isDisabled) return "disabled";
  if (input.invitedAt && !input.lastSignInAt) return "invited";
  return "active";
}

export async function listAdminUsers(
  filters?: AdminUserFilters
): Promise<AdminUser[]> {
  const query = filters?.query ?? null;
  const statusFilter = filters?.status ?? "all";
  const orgFilter =
    filters?.organizationId && filters.organizationId !== "all"
      ? filters.organizationId
      : null;

  if (!isSupabaseConfigured()) {
    const filtered = query
      ? mockAdminUsers.filter((user) =>
          user.email?.toLowerCase().includes(normalizeEmail(query))
        )
      : mockAdminUsers;
    const membershipByUser = new Map<string, Set<string>>();
    mockMemberships.forEach((member) => {
      if (!membershipByUser.has(member.userId)) {
        membershipByUser.set(member.userId, new Set());
      }
      membershipByUser.get(member.userId)?.add(member.organizationId);
    });

    const users = filtered.map((user) => {
      const status = deriveAdminUserStatus({
        isDisabled: user.isDisabled,
        invitedAt: user.invitedAt ?? null,
        lastSignInAt: user.lastSignInAt ?? null,
      });
      return {
        ...user,
        membershipCount: mockMemberships.filter(
          (member) => member.userId === user.id
        ).length,
        invitedAt: user.invitedAt ?? null,
        status,
      } as AdminUser;
    });

    return users.filter((user) => {
      if (statusFilter !== "all" && user.status !== statusFilter) {
        return false;
      }
      if (orgFilter) {
        const memberships = membershipByUser.get(user.id) ?? new Set();
        return memberships.has(orgFilter);
      }
      return true;
    });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error || !data) return [];

  const memberships = await admin
    .from("memberships")
    .select("user_id, organization_id");
  const membershipCount = new Map<string, number>();
  const membershipOrgs = new Map<string, Set<string>>();
  (memberships.data ?? []).forEach((row) => {
    const userId = row.user_id as string;
    membershipCount.set(userId, (membershipCount.get(userId) ?? 0) + 1);
    const orgId = row.organization_id as string;
    if (!membershipOrgs.has(userId)) {
      membershipOrgs.set(userId, new Set());
    }
    membershipOrgs.get(userId)?.add(orgId);
  });

  const admins = await admin.from("system_admins").select("user_id");
  const adminSet = new Set(
    (admins.data ?? []).map((row) => row.user_id as string)
  );
  const blocked = await listBlockedUserIds();
  const blockedSet = blocked.ids;

  const normalizedQuery = query ? normalizeEmail(query) : null;

  const users = (data.users ?? [])
    .filter((user) => {
      if (!normalizedQuery) return true;
      return user.email?.toLowerCase().includes(normalizedQuery) ?? false;
    })
    .map((user) => {
      const bannedUntil = (user as { banned_until?: string | null }).banned_until;
      const invitedAt = (user as { invited_at?: string | null }).invited_at ?? null;
      const banActive = bannedUntil
        ? new Date(bannedUntil).getTime() > Date.now()
        : false;
      const status = deriveAdminUserStatus({
        isDisabled: banActive || blockedSet.has(user.id),
        invitedAt,
        lastSignInAt: user.last_sign_in_at ?? null,
      });
      return {
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
        invitedAt,
        lastSignInAt: user.last_sign_in_at ?? null,
        membershipCount: membershipCount.get(user.id) ?? 0,
        isSystemAdmin: adminSet.has(user.id),
        isDisabled: banActive || blockedSet.has(user.id),
        status,
      } as AdminUser;
    });

  return users.filter((user) => {
    if (statusFilter !== "all" && user.status !== statusFilter) {
      return false;
    }
    if (orgFilter) {
      const memberships = membershipOrgs.get(user.id) ?? new Set();
      return memberships.has(orgFilter);
    }
    return true;
  });
}

export async function findUserIdByEmail(
  email: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    const normalized = normalizeEmail(email);
    const user = mockAdminUsers.find(
      (item) => item.email?.toLowerCase() === normalized
    );
    return user?.id ?? null;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error || !data) return null;

  const normalized = normalizeEmail(email);
  const found = data.users?.find(
    (user) => user.email?.toLowerCase() === normalized
  );
  return found?.id ?? null;
}

export async function createInviteUser(
  email: string
): Promise<CreateUserResult | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const env = getEnv();
  const redirectTo = env.APP_BASE_URL
    ? `${env.APP_BASE_URL}/auth/sign-in`
    : undefined;
  const response = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });
  if (response.error || !response.data?.user) return null;

  return {
    userId: response.data.user.id,
    email: response.data.user.email ?? email,
    invited: true,
  };
}

export async function generateInviteLink(
  email: string
): Promise<InviteLinkResult | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const env = getEnv();
  const redirectTo = env.APP_BASE_URL
    ? `${env.APP_BASE_URL}/auth/sign-in`
    : undefined;

  const response = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });

  if (response.error || !response.data?.user) return null;
  const actionLink = response.data.properties?.action_link;
  if (!actionLink) return null;

  return {
    userId: response.data.user.id,
    email: response.data.user.email ?? email,
    inviteLink: actionLink,
  };
}

export async function createTempPasswordUser(
  email: string
): Promise<CreateUserResult | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const tempPassword = generateTempPassword();
  const response = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (response.error || !response.data?.user) return null;

  return {
    userId: response.data.user.id,
    email: response.data.user.email ?? email,
    tempPassword,
    invited: false,
  };
}

export async function disableAdminUser(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const response = await admin.auth.admin.updateUserById(userId, {
    ban_duration: DEFAULT_BAN_DURATION,
  });

  return !response.error;
}

export async function enableAdminUser(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const response = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  return !response.error;
}

export async function deleteAdminUser(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const response = await admin.auth.admin.deleteUser(userId);
  return !response.error;
}

export async function getUserEmailById(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return mockAdminUsers.find((user) => user.id === userId)?.email ?? null;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  return data.user.email ?? null;
}
