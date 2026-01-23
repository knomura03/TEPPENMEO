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
import { replyMetaCommentForLocation, toMetaCommentUiError } from "@/server/services/meta-comments";
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
  replyText: z
    .string()
    .trim()
    .min(1, "返信内容は必須です。")
    .max(500, "返信内容は500文字以内で入力してください。"),
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
        nextAction: "組織管理者に組織設定を確認してください。",
      },
    };
  }

  const role = await getMembershipRole(user.id, org.id);
  if (!hasRequiredRole(role, "admin")) {
    return {
      error: {
        cause: "権限がありません。",
        nextAction: "組織管理者に権限付与を依頼してください。",
      },
    };
  }

  const location = await getLocationById(params.locationId);
  if (!location || location.organizationId !== org.id) {
    return {
      error: {
        cause: "店舗が見つかりません。",
        nextAction: "店舗一覧から選び直してください。",
      },
    };
  }

  const review = await getReviewById(params.reviewId);
  if (!review || review.locationId !== params.locationId) {
    return {
      error: {
        cause: "口コミ・コメントが見つかりません。",
        nextAction: "受信箱を更新して再試行してください。",
      },
    };
  }

  if (
    review.provider !== ProviderType.GoogleBusinessProfile &&
    review.provider !== ProviderType.Meta
  ) {
    return {
      error: {
        cause: "この口コミ・コメントは現在返信できません。",
        nextAction: "対応可能な項目を選択してください。",
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
    if (access.review.provider === ProviderType.GoogleBusinessProfile) {
      await replyGoogleReviewForLocation({
        organizationId: access.org.id,
        locationId: access.location.id,
        actorUserId: access.user.id,
        reviewId: access.review.id,
        replyText: parsed.data.replyText,
      });
    } else if (access.review.provider === ProviderType.Meta) {
      await replyMetaCommentForLocation({
        organizationId: access.org.id,
        locationId: access.location.id,
        actorUserId: access.user.id,
        reviewId: access.review.id,
        externalReviewId: access.review.externalReviewId,
        replyText: parsed.data.replyText,
      });
    } else {
      return {
        error: {
          cause: "この口コミ・コメントは現在返信できません。",
          nextAction: "対応可能な項目を選択してください。",
        },
        success: null,
      };
    }

    revalidatePath("/app/reviews");
    revalidatePath(`/app/locations/${access.location.id}`);
    return {
      error: null,
      success: "返信を送信しました。",
    };
  } catch (error) {
    const providerError = toProviderError(access.review.provider as ProviderType, error);
    await writeAuditLog({
      actorUserId: access.user.id,
      organizationId: access.org.id,
      action: "reviews.reply_failed",
      targetType: "review",
      targetId: access.review.id,
      metadata: {
        provider: access.review.provider,
        reason: providerError.message,
      },
    });
    if (providerError.code === "auth_required") {
      await markProviderError(
        access.org.id,
        access.review.provider as ProviderType,
        providerError.message,
        providerError.status === 401
      );
    }
    const uiError =
      access.review.provider === ProviderType.Meta
        ? toMetaCommentUiError(providerError)
        : toUiError(providerError);
    return { error: uiError, success: null };
  }
}
