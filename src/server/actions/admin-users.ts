"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/server/auth/session";
import { isSystemAdmin } from "@/server/auth/rbac";
import {
  createInviteUser,
  createTempPasswordUser,
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  generateInviteLink,
  getUserEmailById,
} from "@/server/services/admin-users";
import { writeAuditLog } from "@/server/services/audit-logs";
import { checkUserBlocksSchema } from "@/server/services/diagnostics";
import { blockUser, unblockUser } from "@/server/services/user-blocks";
import { isSupabaseAdminConfigured } from "@/server/utils/env";

export type AdminUserActionState = {
  error: string | null;
  success: string | null;
  tempPassword?: string | null;
  inviteLink?: string | null;
};

const createSchema = z.object({
  email: z.string().email("正しいメールアドレスを入力してください。"),
  mode: z.enum(["invite", "invite_link", "temp"]),
});

const deleteSchema = z.object({
  userId: z.string().min(1),
  confirmEmail: z.string().email(),
});

const toggleSchema = z.object({
  userId: z.string().min(1),
  mode: z.enum(["disable", "enable"]),
  confirmEmail: z.string().email().optional(),
  reason: z
    .string()
    .max(200, "理由は200文字以内で入力してください。")
    .optional(),
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

  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabaseが未設定のため操作できません。", success: null };
  }

  const access = await requireSystemAdmin();
  if (access.error) {
    return { error: access.error, success: null };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const mode = parsed.data.mode;

  if (mode === "invite") {
    const result = await createInviteUser(email);
    if (result) {
      await writeAuditLog({
        actorUserId: access.userId,
        organizationId: null,
        action: "admin.user.invite",
        targetType: "user",
        targetId: result.userId,
        metadata: { email: result.email, mode: "invite" },
      });
      revalidatePath("/admin/users");
      return {
        error: null,
        success: "招待メールを送信しました。",
        tempPassword: null,
        inviteLink: null,
      };
    }

    const inviteLink = await generateInviteLink(email);
    if (!inviteLink) {
      await writeAuditLog({
        actorUserId: access.userId,
        organizationId: null,
        action: "admin.user.invite_failed",
        targetType: "user",
        metadata: { email, mode: "invite" },
      });
      return {
        error: "招待メール送信に失敗しました。設定と権限を確認してください。",
        success: null,
        tempPassword: null,
        inviteLink: null,
      };
    }

    await writeAuditLog({
      actorUserId: access.userId,
      organizationId: null,
      action: "admin.user.invite_fallback",
      targetType: "user",
      targetId: inviteLink.userId,
      metadata: { email: inviteLink.email, mode: "invite_link" },
    });
    revalidatePath("/admin/users");
    return {
      error: null,
      success:
        "招待メール送信に失敗したため、招待リンクを生成しました。",
      tempPassword: null,
      inviteLink: inviteLink.inviteLink,
    };
  }

  if (mode === "invite_link") {
    const inviteLink = await generateInviteLink(email);
    if (!inviteLink) {
      await writeAuditLog({
        actorUserId: access.userId,
        organizationId: null,
        action: "admin.user.invite_link_failed",
        targetType: "user",
        metadata: { email, mode: "invite_link" },
      });
      return {
        error: "招待リンクの生成に失敗しました。設定と権限を確認してください。",
        success: null,
        tempPassword: null,
        inviteLink: null,
      };
    }

    await writeAuditLog({
      actorUserId: access.userId,
      organizationId: null,
      action: "admin.user.invite_link",
      targetType: "user",
      targetId: inviteLink.userId,
      metadata: { email: inviteLink.email, mode: "invite_link" },
    });
    revalidatePath("/admin/users");
    return {
      error: null,
      success: "招待リンクを生成しました。",
      tempPassword: null,
      inviteLink: inviteLink.inviteLink,
    };
  }

  const result = await createTempPasswordUser(email);
  if (!result) {
    await writeAuditLog({
      actorUserId: access.userId,
      organizationId: null,
      action: "admin.user.create_failed",
      targetType: "user",
      metadata: { email, mode: "temp" },
    });
    return {
      error: "ユーザー作成に失敗しました。設定と権限を確認してください。",
      success: null,
      tempPassword: null,
      inviteLink: null,
    };
  }

  await writeAuditLog({
    actorUserId: access.userId,
    organizationId: null,
    action: "admin.user.create_temp",
    targetType: "user",
    targetId: result.userId,
    metadata: { email: result.email, mode: "temp" },
  });

  revalidatePath("/admin/users");

  return {
    error: null,
    success: "仮パスワードでユーザーを作成しました。",
    tempPassword: result.tempPassword ?? null,
    inviteLink: null,
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

  if (!isSupabaseAdminConfigured()) {
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
  return {
    error: null,
    success: "ユーザーを削除しました。",
    tempPassword: null,
    inviteLink: null,
  };
}

export async function toggleAdminUserDisabledAction(
  _prev: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const parsed = toggleSchema.safeParse({
    userId: formData.get("userId"),
    mode: formData.get("mode"),
    confirmEmail:
      typeof formData.get("confirmEmail") === "string"
        ? formData.get("confirmEmail")
        : undefined,
    reason:
      typeof formData.get("reason") === "string"
        ? formData.get("reason")
        : undefined,
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

  if (access.userId === parsed.data.userId && parsed.data.mode === "disable") {
    return { error: "自分自身は無効化できません。", success: null };
  }

  const actualEmail = await getUserEmailById(parsed.data.userId);
  if (!actualEmail) {
    return { error: "対象ユーザーが見つかりません。", success: null };
  }

  if (parsed.data.mode === "disable") {
    const confirmEmail = parsed.data.confirmEmail;
    const reason = parsed.data.reason?.trim() ?? "";
    if (!confirmEmail) {
      return { error: "確認メールアドレスを入力してください。", success: null };
    }
    if (actualEmail.toLowerCase() !== confirmEmail.toLowerCase()) {
      return { error: "確認メールアドレスが一致しません。", success: null };
    }
    if (!reason) {
      return { error: "無効化理由を入力してください。", success: null };
    }

    const schema = await checkUserBlocksSchema();
    if (schema.status !== "ok") {
      return {
        error:
          "ユーザー無効化に必要なマイグレーションが未適用です。適用手順を確認してください。",
        success: null,
      };
    }

    const banApplied = await disableAdminUser(parsed.data.userId);
    const blocked = await blockUser(
      parsed.data.userId,
      access.userId,
      reason
    );

    if (!blocked.ok) {
      await writeAuditLog({
        actorUserId: access.userId,
        organizationId: null,
        action: "admin.user.disable_failed",
        targetType: "user",
        targetId: parsed.data.userId,
        metadata: {
          email: actualEmail,
          banApplied,
          reason,
          blockError: blocked.error ?? "block_failed",
        },
      });
      return {
        error:
          "無効化に失敗しました。Supabaseの設定とRLS、マイグレーションを確認してください。",
        success: null,
      };
    }

    await writeAuditLog({
      actorUserId: access.userId,
      organizationId: null,
      action: "admin.user.disable",
      targetType: "user",
      targetId: parsed.data.userId,
      metadata: { email: actualEmail, banApplied, reason },
    });

    revalidatePath("/admin/users");
    return {
      error: null,
      success: banApplied
        ? "ユーザーを無効化しました。"
        : "ユーザーを無効化しました。Supabase側の停止に失敗しているため、設定を確認してください。",
      tempPassword: null,
      inviteLink: null,
    };
  }

  const schema = await checkUserBlocksSchema();
  if (schema.status !== "ok") {
    return {
      error:
        "ユーザー有効化に必要なマイグレーションが未適用です。適用手順を確認してください。",
      success: null,
    };
  }

  const unbanApplied = await enableAdminUser(parsed.data.userId);
  const unblocked = await unblockUser(parsed.data.userId);
  if (!unblocked.ok) {
    await writeAuditLog({
      actorUserId: access.userId,
      organizationId: null,
      action: "admin.user.enable_failed",
      targetType: "user",
      targetId: parsed.data.userId,
      metadata: {
        email: actualEmail,
        unbanApplied,
        unblockError: unblocked.error ?? "unblock_failed",
      },
    });
    return {
      error:
        "有効化に失敗しました。Supabaseの設定とRLS、マイグレーションを確認してください。",
      success: null,
    };
  }

  await writeAuditLog({
    actorUserId: access.userId,
    organizationId: null,
    action: "admin.user.enable",
    targetType: "user",
    targetId: parsed.data.userId,
    metadata: { email: actualEmail, unbanApplied },
  });

  revalidatePath("/admin/users");
  return {
    error: null,
    success: unbanApplied
      ? "ユーザーを有効化しました。"
      : "ユーザーを有効化しました。Supabase側の解除に失敗しているため、設定を確認してください。",
    tempPassword: null,
    inviteLink: null,
  };
}
