"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MembershipRole, isSystemAdmin } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import {
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "@/server/services/admin-organizations";
import { findUserIdByEmail } from "@/server/services/admin-users";
import { writeAuditLog } from "@/server/services/audit-logs";
import { isSupabaseAdminConfigured } from "@/server/utils/env";

export type AdminOrgActionState = {
  error: string | null;
  success: string | null;
};

const addSchema = z.object({
  organizationId: z.string().min(1),
  email: z.string().email("正しいメールアドレスを入力してください。"),
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

const updateSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

const removeSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
});

async function requireSystemAdmin() {
  const user = await getSessionUser();
  if (!user) {
    return { error: "ログインが必要です。", userId: null };
  }
  if (user.isBlocked) {
    return {
      error: "このアカウントは無効化されています。管理者に連絡してください。",
      userId: null,
    };
  }

  const admin = await isSystemAdmin(user.id);
  if (!admin) {
    return { error: "システム管理者のみ操作できます。", userId: null };
  }

  return { error: null, userId: user.id };
}

export async function addOrganizationMemberAction(
  _prev: AdminOrgActionState,
  formData: FormData
): Promise<AdminOrgActionState> {
  const parsed = addSchema.safeParse({
    organizationId: formData.get("organizationId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容が不正です。", success: null };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabaseが未設定のため操作できません。", success: null };
  }

  const access = await requireSystemAdmin();
  if (access.error) {
    return { error: access.error, success: null };
  }

  const userId = await findUserIdByEmail(parsed.data.email);
  if (!userId) {
    return { error: "対象ユーザーが見つかりません。", success: null };
  }

  const ok = await addOrganizationMember({
    organizationId: parsed.data.organizationId,
    userId,
    role: parsed.data.role as MembershipRole,
  });

  if (!ok) {
    return { error: "メンバー追加に失敗しました。", success: null };
  }

  await writeAuditLog({
    actorUserId: access.userId,
    organizationId: parsed.data.organizationId,
    action: "admin.membership.add",
    targetType: "membership",
    targetId: userId,
    metadata: { role: parsed.data.role },
  });

  revalidatePath(`/admin/organizations/${parsed.data.organizationId}`);
  return { error: null, success: "メンバーを追加しました。" };
}

export async function updateOrganizationMemberRoleAction(
  _prev: AdminOrgActionState,
  formData: FormData
): Promise<AdminOrgActionState> {
  const parsed = updateSchema.safeParse({
    organizationId: formData.get("organizationId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: "入力内容が不正です。", success: null };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabaseが未設定のため操作できません。", success: null };
  }

  const access = await requireSystemAdmin();
  if (access.error) {
    return { error: access.error, success: null };
  }

  const ok = await updateOrganizationMemberRole({
    organizationId: parsed.data.organizationId,
    userId: parsed.data.userId,
    role: parsed.data.role as MembershipRole,
  });

  if (!ok) {
    return { error: "ロール変更に失敗しました。", success: null };
  }

  await writeAuditLog({
    actorUserId: access.userId,
    organizationId: parsed.data.organizationId,
    action: "admin.membership.update_role",
    targetType: "membership",
    targetId: parsed.data.userId,
    metadata: { role: parsed.data.role },
  });

  revalidatePath(`/admin/organizations/${parsed.data.organizationId}`);
  return { error: null, success: "ロールを更新しました。" };
}

export async function removeOrganizationMemberAction(
  _prev: AdminOrgActionState,
  formData: FormData
): Promise<AdminOrgActionState> {
  const parsed = removeSchema.safeParse({
    organizationId: formData.get("organizationId"),
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return { error: "入力内容が不正です。", success: null };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabaseが未設定のため操作できません。", success: null };
  }

  const access = await requireSystemAdmin();
  if (access.error) {
    return { error: access.error, success: null };
  }

  const ok = await removeOrganizationMember({
    organizationId: parsed.data.organizationId,
    userId: parsed.data.userId,
  });

  if (!ok) {
    return { error: "メンバー削除に失敗しました。", success: null };
  }

  await writeAuditLog({
    actorUserId: access.userId,
    organizationId: parsed.data.organizationId,
    action: "admin.membership.remove",
    targetType: "membership",
    targetId: parsed.data.userId,
  });

  revalidatePath(`/admin/organizations/${parsed.data.organizationId}`);
  return { error: null, success: "メンバーを削除しました。" };
}
