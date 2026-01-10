"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getActiveSessionUser } from "@/server/auth/session";
import { toProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import { writeAuditLog } from "@/server/services/audit-logs";
import { replyGoogleReviewForLocation, toUiError } from "@/server/services/google-business-profile";
import { getLocationById } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { markProviderError } from "@/server/services/provider-accounts";
import { getReviewById } from "@/server/services/reviews";

export type InboxReplyState = {
  error: { cause: string; nextAction: string } | null;
  success: string | null;
};

const replySchema = z.object({
  locationId: z.string().min(1),
  reviewId: z.string().min(1),
  replyText: z.string().trim().min(1, "返信内容は必須です。"),
});

type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getActiveSessionUser>>
>;
type PrimaryOrg = NonNullable<Awaited<ReturnType<typeof getPrimaryOrganization>>>;
type LocationRecord = NonNullable<Awaited<ReturnType<typeof getLocationById>>>;
type ReviewRecord = NonNullable<Awaited<ReturnType<typeof getReviewById>>>;

type AccessResult =
  | { error: { cause: string; nextAction: string } }
  | {
      user: SessionUser;
      org: PrimaryOrg;
      location: LocationRecord;
      review: ReviewRecord;
    };

async function requireReplyAccess(params: {
  locationId: string;
  reviewId: string;
}): Promise<AccessResult> {
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

  const location = await getLocationById(params.locationId);
  if (!location || location.organizationId !== org.id) {
    return {
      error: {
        cause: "ロケーションが見つかりません。",
        nextAction: "ロケーション一覧から選び直してください。",
      },
    };
  }

  const review = await getReviewById(params.reviewId);
  if (!review || review.locationId !== params.locationId) {
    return {
      error: {
        cause: "レビューが見つかりません。",
        nextAction: "レビュー一覧を更新して再試行してください。",
      },
    };
  }

  if (review.provider !== ProviderType.GoogleBusinessProfile) {
    return {
      error: {
        cause: "Googleレビュー以外は返信できません。",
        nextAction: "対応可能なレビューを選択してください。",
      },
    };
  }

  return { user, org, location, review };
}

export async function replyReviewFromInboxAction(
  _prev: InboxReplyState,
  formData: FormData
): Promise<InboxReplyState> {
  const parsed = replySchema.safeParse({
    locationId: formData.get("locationId"),
    reviewId: formData.get("reviewId"),
    replyText: formData.get("replyText"),
  });

  if (!parsed.success) {
    return {
      error: {
        cause: "入力内容が不正です。",
        nextAction: "返信内容を見直してください。",
      },
      success: null,
    };
  }

  const access = await requireReplyAccess({
    locationId: parsed.data.locationId,
    reviewId: parsed.data.reviewId,
  });
  if ("error" in access) {
    return { error: access.error, success: null };
  }

  try {
    await replyGoogleReviewForLocation({
      organizationId: access.org.id,
      locationId: access.location.id,
      actorUserId: access.user.id,
      reviewId: access.review.id,
      replyText: parsed.data.replyText,
    });

    revalidatePath("/app/reviews");
    revalidatePath(`/app/locations/${access.location.id}`);
    return {
      error: null,
      success: "レビュー返信を送信しました。",
    };
  } catch (error) {
    const providerError = toProviderError(
      ProviderType.GoogleBusinessProfile,
      error
    );
    await writeAuditLog({
      actorUserId: access.user.id,
      organizationId: access.org.id,
      action: "reviews.reply_failed",
      targetType: "review",
      targetId: access.review.id,
      metadata: { reason: providerError.message },
    });
    if (providerError.code === "auth_required") {
      await markProviderError(
        access.org.id,
        ProviderType.GoogleBusinessProfile,
        providerError.message,
        providerError.status === 401
      );
    }
    return { error: toUiError(providerError), success: null };
  }
}
