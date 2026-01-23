"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getActiveSessionUser } from "@/server/auth/session";
import { getPrimaryOrganization } from "@/server/services/organizations";
import {
  archivePostTemplate,
  createPostTemplate,
  updatePostTemplate,
} from "@/server/services/post-templates";

export type TemplateActionState = {
  error: string | null;
  success: string | null;
};

const templateSchema = z.object({
  name: z.string().trim().min(1, "テンプレ名は必須です。"),
  body: z.string().trim().min(1, "本文は必須です。"),
  targetFacebook: z.boolean(),
  targetInstagram: z.boolean(),
  targetGoogle: z.boolean(),
});

const idSchema = z.string().min(1);

async function requireTemplateAccess(): Promise<
  | { error: string }
  | { userId: string; organizationId: string }
> {
  const user = await getActiveSessionUser();
  if (!user) {
    return { error: "ログインが必要です。" };
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return { error: "管理者情報が確認できません。管理者に確認してください。" };
  }

  const role = await getMembershipRole(user.id, org.id);
  if (!hasRequiredRole(role, "admin")) {
    return { error: "管理者のみ操作できます。" };
  }

  return { userId: user.id, organizationId: org.id };
}

function resolveTargets(formData: FormData) {
  return {
    facebook: formData.get("targetFacebook") === "on",
    instagram: formData.get("targetInstagram") === "on",
    google: formData.get("targetGoogle") === "on",
  };
}

function toUserTemplateError(
  message: string | null | undefined,
  fallback: string
) {
  if (!message) return fallback;
  if (
    message.includes("SUPABASE") ||
    message.includes("Supabase") ||
    message.includes("post_templates")
  ) {
    return "テンプレートを使うには管理者側の設定が必要です。";
  }
  return message;
}

export async function createPostTemplateAction(
  _prev: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    body: formData.get("body"),
    targetFacebook: formData.get("targetFacebook") === "on",
    targetInstagram: formData.get("targetInstagram") === "on",
    targetGoogle: formData.get("targetGoogle") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容が不正です。", success: null };
  }

  const access = await requireTemplateAccess();
  if ("error" in access) {
    return { error: access.error, success: null };
  }

  const result = await createPostTemplate({
    organizationId: access.organizationId,
    name: parsed.data.name,
    body: parsed.data.body,
    defaultTargets: resolveTargets(formData),
    actorUserId: access.userId,
  });

  if (!result.ok) {
    return {
      error: toUserTemplateError(result.reason, "テンプレートの保存に失敗しました。"),
      success: null,
    };
  }

  revalidatePath("/app/post-templates");
  return { error: null, success: "テンプレを追加しました。" };
}

export async function updatePostTemplateAction(
  _prev: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  const id = formData.get("id");
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return { error: "テンプレートIDが不正です。", success: null };
  }

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    body: formData.get("body"),
    targetFacebook: formData.get("targetFacebook") === "on",
    targetInstagram: formData.get("targetInstagram") === "on",
    targetGoogle: formData.get("targetGoogle") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容が不正です。", success: null };
  }

  const access = await requireTemplateAccess();
  if ("error" in access) {
    return { error: access.error, success: null };
  }

  const result = await updatePostTemplate({
    id: parsedId.data,
    organizationId: access.organizationId,
    name: parsed.data.name,
    body: parsed.data.body,
    defaultTargets: resolveTargets(formData),
    actorUserId: access.userId,
  });

  if (!result.ok) {
    return {
      error: toUserTemplateError(result.reason, "テンプレートの更新に失敗しました。"),
      success: null,
    };
  }

  revalidatePath("/app/post-templates");
  return { error: null, success: "テンプレを更新しました。" };
}

export async function archivePostTemplateAction(
  _prev: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  const id = formData.get("id");
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return { error: "テンプレートIDが不正です。", success: null };
  }

  const access = await requireTemplateAccess();
  if ("error" in access) {
    return { error: access.error, success: null };
  }

  const result = await archivePostTemplate({
    id: parsedId.data,
    organizationId: access.organizationId,
    actorUserId: access.userId,
  });

  if (!result.ok) {
    return {
      error: toUserTemplateError(result.reason, "テンプレートの更新に失敗しました。"),
      success: null,
    };
  }

  revalidatePath("/app/post-templates");
  return { error: null, success: "テンプレを非表示にしました。" };
}
