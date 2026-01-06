"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getActiveSessionUser } from "@/server/auth/session";
import { toProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import {
  linkMetaPage,
  publishMetaPost,
  toUiError,
  unlinkMetaPage,
} from "@/server/services/meta";
import { getLocationById } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { markProviderError } from "@/server/services/provider-accounts";
import { writeAuditLog } from "@/server/services/audit-logs";
import { isMockMode } from "@/server/utils/feature-flags";

export type ActionState = {
  error: { cause: string; nextAction: string } | null;
  success: string | null;
};

const linkSchema = z.object({
  locationId: z.string().min(1),
  pageId: z.string().min(1),
  pageName: z.string().min(1),
  instagramId: z.string().optional(),
  instagramUsername: z.string().optional(),
});

const unlinkSchema = z.object({
  locationId: z.string().min(1),
});

const postSchema = z.object({
  locationId: z.string().min(1),
  content: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  publishFacebook: z.boolean(),
  publishInstagram: z.boolean(),
});

type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getActiveSessionUser>>
>;
type PrimaryOrg = NonNullable<Awaited<ReturnType<typeof getPrimaryOrganization>>>;
type LocationRecord = NonNullable<Awaited<ReturnType<typeof getLocationById>>>;

type AccessResult =
  | { error: { cause: string; nextAction: string } }
  | {
      user: SessionUser;
      org: PrimaryOrg;
      location: LocationRecord;
    };

async function requireLocationAccess(locationId: string): Promise<AccessResult> {
  const user = await getActiveSessionUser();
  if (!user) {
    return { error: { cause: "ログインが必要です。", nextAction: "サインインしてください。" } };
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return {
      error: {
        cause: "所属組織が見つかりません。",
        nextAction: "管理者に組織設定を確認してください。",
      },
    };
  }

  const role = await getMembershipRole(user.id, org.id);
  if (!hasRequiredRole(role, "admin")) {
    return {
      error: {
        cause: "権限がありません。",
        nextAction: "管理者に権限付与を依頼してください。",
      },
    };
  }

  const location = await getLocationById(locationId);
  if (!location || location.organizationId !== org.id) {
    return {
      error: {
        cause: "ロケーションが見つかりません。",
        nextAction: "ロケーション一覧から選び直してください。",
      },
    };
  }

  return { user, org, location };
}

export async function linkMetaPageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = linkSchema.safeParse({
    locationId: formData.get("locationId"),
    pageId: formData.get("pageId"),
    pageName: formData.get("pageName"),
    instagramId: formData.get("instagramId"),
    instagramUsername: formData.get("instagramUsername"),
  });

  if (!parsed.success) {
    return {
      error: {
        cause: "入力内容が不正です。",
        nextAction: "ページ候補を選び直してください。",
      },
      success: null,
    };
  }

  const access = await requireLocationAccess(parsed.data.locationId);
  if ("error" in access) {
    return { error: access.error, success: null };
  }

  try {
    await linkMetaPage({
      organizationId: access.org.id,
      locationId: parsed.data.locationId,
      actorUserId: access.user.id,
      pageId: parsed.data.pageId,
      pageName: parsed.data.pageName,
      instagramId: parsed.data.instagramId,
      instagramUsername: parsed.data.instagramUsername,
    });

    revalidatePath(`/app/locations/${parsed.data.locationId}`);
    return {
      error: null,
      success: isMockMode()
        ? "モックのページ紐付けを更新しました。"
        : "Facebookページを紐付けました。",
    };
  } catch (error) {
    const providerError = toProviderError(ProviderType.Meta, error);
    await writeAuditLog({
      actorUserId: access.user.id,
      organizationId: access.org.id,
      action: "provider.link_location_failed",
      targetType: "location",
      targetId: parsed.data.locationId,
      metadata: { reason: providerError.message },
    });
    if (providerError.code === "auth_required") {
      await markProviderError(
        access.org.id,
        ProviderType.Meta,
        providerError.message,
        providerError.status === 401
      );
    }
    return { error: toUiError(providerError), success: null };
  }
}

export async function unlinkMetaPageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = unlinkSchema.safeParse({
    locationId: formData.get("locationId"),
  });

  if (!parsed.success) {
    return {
      error: {
        cause: "入力内容が不正です。",
        nextAction: "ロケーション詳細を開き直してください。",
      },
      success: null,
    };
  }

  const access = await requireLocationAccess(parsed.data.locationId);
  if ("error" in access) {
    return { error: access.error, success: null };
  }

  try {
    await unlinkMetaPage({
      organizationId: access.org.id,
      locationId: parsed.data.locationId,
      actorUserId: access.user.id,
    });

    revalidatePath(`/app/locations/${parsed.data.locationId}`);
    return {
      error: null,
      success: "紐付けを解除しました。",
    };
  } catch (error) {
    const providerError = toProviderError(ProviderType.Meta, error);
    await writeAuditLog({
      actorUserId: access.user.id,
      organizationId: access.org.id,
      action: "provider.unlink_location_failed",
      targetType: "location",
      targetId: parsed.data.locationId,
      metadata: { reason: providerError.message },
    });
    return { error: toUiError(providerError), success: null };
  }
}

export async function publishMetaPostAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = postSchema.safeParse({
    locationId: formData.get("locationId"),
    content: formData.get("content") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    publishFacebook: formData.get("publishFacebook") === "on",
    publishInstagram: formData.get("publishInstagram") === "on",
  });

  if (!parsed.success) {
    return {
      error: {
        cause: "入力内容が不正です。",
        nextAction: "投稿内容を見直してください。",
      },
      success: null,
    };
  }

  const access = await requireLocationAccess(parsed.data.locationId);
  if ("error" in access) {
    return { error: access.error, success: null };
  }

  const content = parsed.data.content?.trim() ?? "";
  const imageUrl = parsed.data.imageUrl?.trim() || null;

  if (imageUrl) {
    const urlCheck = z.string().url().safeParse(imageUrl);
    if (!urlCheck.success) {
      return {
        error: {
          cause: "画像URLの形式が不正です。",
          nextAction: "http/httpsのURLを入力してください。",
        },
        success: null,
      };
    }
  }

  if (!parsed.data.publishFacebook && !parsed.data.publishInstagram) {
    return {
      error: {
        cause: "投稿先が未選択です。",
        nextAction: "FacebookまたはInstagramを選択してください。",
      },
      success: null,
    };
  }

  if (parsed.data.publishFacebook && content.length === 0) {
    return {
      error: {
        cause: "Facebook投稿本文が未入力です。",
        nextAction: "投稿本文を入力してください。",
      },
      success: null,
    };
  }

  if (parsed.data.publishInstagram && !imageUrl) {
    return {
      error: {
        cause: "Instagram投稿は画像URLが必須です。",
        nextAction: "画像URLを入力してください。",
      },
      success: null,
    };
  }

  try {
    const result = await publishMetaPost({
      organizationId: access.org.id,
      locationId: parsed.data.locationId,
      actorUserId: access.user.id,
      content,
      imageUrl,
      publishFacebook: parsed.data.publishFacebook,
      publishInstagram: parsed.data.publishInstagram,
    });

    revalidatePath(`/app/locations/${parsed.data.locationId}`);

    if (result.failedTargets.length === 0) {
      const targets = result.successTargets
        .map((target) => (target === "facebook" ? "Facebook" : "Instagram"))
        .join(" / ");
      return {
        error: null,
        success: `投稿が完了しました（${targets}）。`,
      };
    }

    const failedLabels = result.failedTargets
      .map((item) => (item.target === "facebook" ? "Facebook" : "Instagram"))
      .join(" / ");
    const hasSuccess = result.successTargets.length > 0;
    const successLabel = hasSuccess
      ? `（成功: ${result.successTargets
          .map((target) => (target === "facebook" ? "Facebook" : "Instagram"))
          .join(" / ")}）`
      : "";

    return {
      error: {
        cause: `${failedLabels}の投稿に失敗しました${successLabel}。`,
        nextAction:
          "権限と連携状態を確認し、必要なら再認可後に再投稿してください。",
      },
      success: null,
    };
  } catch (error) {
    const providerError = toProviderError(ProviderType.Meta, error);
    await writeAuditLog({
      actorUserId: access.user.id,
      organizationId: access.org.id,
      action: "posts.publish_failed",
      targetType: "location",
      targetId: parsed.data.locationId,
      metadata: { reason: providerError.message },
    });
    if (providerError.code === "auth_required") {
      await markProviderError(
        access.org.id,
        ProviderType.Meta,
        providerError.message,
        providerError.status === 401
      );
    }
    return { error: toUiError(providerError), success: null };
  }
}
