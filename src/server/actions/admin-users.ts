"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/server/auth/session";
import { isSystemAdmin } from "@/server/auth/rbac";
import {
  createInviteUser,
  createTempPasswordUser,
  deleteAdminUser,
  getUserEmailById,
} from "@/server/services/admin-users";
import { writeAuditLog } from "@/server/services/audit-logs";
import { isSupabaseConfigured } from "@/server/utils/env";

export type AdminUserActionState = {
  error: string | null;
  success: string | null;
  tempPassword?: string | null;
};

const createSchema = z.object({
  email: z.string().email("正しいメールアドレスを入力してください。"),
  mode: z.enum(["invite", "temp"]),
});

const deleteSchema = z.object({
  userId: z.string().min(1),
  confirmEmail: z.string().email(),
});

async function requireSystemAdmin() {
  const user = await getSessionUser();
  if (!user) {
    return { error: "ログインが必要です。", userId: null };
  }

  const admin = await isSystemAdmin(user.id);
  if (!admin) {
    return { error: "システム管理者のみ操作できます。", userId: null };
  }

  return { error: null, userId: user.id };
}

export async function createAdminUserAction(
  _prev: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const parsed = createSchema.safeParse({
    email: formData.get("email"),
    mode: formData.get("mode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容が不正です。", success: null };
  }

  if (!isSupabaseConfigured()) {
    return { error: "Supabaseが未設定のため操作できません。", success: null };
  }

  const access = await requireSystemAdmin();
  if (access.error) {
    return { error: access.error, success: null };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const mode = parsed.data.mode;

  const result =
    mode === "invite"
      ? await createInviteUser(email)
      : await createTempPasswordUser(email);

  if (!result) {
    return {
      error: "ユーザー作成に失敗しました。設定と権限を確認してください。",
      success: null,
    };
  }

  await writeAuditLog({
    actorUserId: access.userId,
    organizationId: null,
    action: mode === "invite" ? "admin.user.invite" : "admin.user.create",
    targetType: "user",
    targetId: result.userId,
    metadata: { email: result.email, mode },
  });

  revalidatePath("/admin/users");

  return {
    error: null,
    success:
      mode === "invite"
        ? "招待メールを送信しました。"
        : "仮パスワードでユーザーを作成しました。",
    tempPassword: result.tempPassword ?? null,
  };
}

export async function deleteAdminUserAction(
  _prev: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const parsed = deleteSchema.safeParse({
    userId: formData.get("userId"),
    confirmEmail: formData.get("confirmEmail"),
  });

  if (!parsed.success) {
    return { error: "削除確認の入力が不正です。", success: null };
  }

  if (!isSupabaseConfigured()) {
    return { error: "Supabaseが未設定のため操作できません。", success: null };
  }

  const access = await requireSystemAdmin();
  if (access.error) {
    return { error: access.error, success: null };
  }

  if (access.userId === parsed.data.userId) {
    return { error: "自分自身は削除できません。", success: null };
  }

  const actualEmail = await getUserEmailById(parsed.data.userId);
  if (!actualEmail) {
    return { error: "対象ユーザーが見つかりません。", success: null };
  }

  if (actualEmail.toLowerCase() !== parsed.data.confirmEmail.toLowerCase()) {
    return { error: "確認メールアドレスが一致しません。", success: null };
  }

  const ok = await deleteAdminUser(parsed.data.userId);
  if (!ok) {
    return { error: "ユーザー削除に失敗しました。", success: null };
  }

  await writeAuditLog({
    actorUserId: access.userId,
    organizationId: null,
    action: "admin.user.delete",
    targetType: "user",
    targetId: parsed.data.userId,
    metadata: { email: actualEmail },
  });

  revalidatePath("/admin/users");
  return { error: null, success: "ユーザーを削除しました。", tempPassword: null };
}
