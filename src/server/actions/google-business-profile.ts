"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getActiveSessionUser } from "@/server/auth/session";
import { toProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import {
  linkGoogleLocation,
  replyGoogleReviewForLocation,
  syncGoogleReviews,
  toUiError,
} from "@/server/services/google-business-profile";
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
  externalLocationId: z.string().min(1),
  displayName: z.string().min(1),
  accountName: z.string().optional(),
  address: z.string().optional(),
});

const syncSchema = z.object({
  locationId: z.string().min(1),
});

const replySchema = z.object({
  locationId: z.string().min(1),
  reviewId: z.string().min(1),
  replyText: z.string().min(1, "返信内容は必須です。"),
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

export async function linkGoogleLocationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = linkSchema.safeParse({
    locationId: formData.get("locationId"),
    externalLocationId: formData.get("externalLocationId"),
    displayName: formData.get("displayName"),
    accountName: formData.get("accountName"),
    address: formData.get("address"),
  });

  if (!parsed.success) {
    return {
      error: {
        cause: "入力内容が不正です。",
        nextAction: "ロケーション候補を選び直してください。",
      },
      success: null,
    };
  }

  const access = await requireLocationAccess(parsed.data.locationId);
  if ("error" in access) {
    return { error: access.error, success: null };
  }

  try {
    await linkGoogleLocation({
      organizationId: access.org.id,
      locationId: parsed.data.locationId,
      actorUserId: access.user.id,
      externalLocationId: parsed.data.externalLocationId,
      metadata: {
        location_name: parsed.data.displayName,
        account_name: parsed.data.accountName ?? null,
        address: parsed.data.address ?? null,
        linked_at: new Date().toISOString(),
      },
    });

    revalidatePath(`/app/locations/${parsed.data.locationId}`);
    return {
      error: null,
      success: isMockMode()
        ? "モックの紐付けを更新しました。"
        : "GBPロケーションを紐付けました。",
    };
  } catch (error) {
    const providerError = toProviderError(
      ProviderType.GoogleBusinessProfile,
      error
    );
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
        ProviderType.GoogleBusinessProfile,
        providerError.message,
        providerError.status === 401
      );
    }
    return { error: toUiError(providerError), success: null };
  }
}

export async function syncGoogleReviewsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = syncSchema.safeParse({
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
    const count = await syncGoogleReviews({
      organizationId: access.org.id,
      locationId: parsed.data.locationId,
      actorUserId: access.user.id,
    });
    revalidatePath(`/app/locations/${parsed.data.locationId}`);
    return {
      error: null,
      success: `レビュー同期が完了しました（${count}件）。`,
    };
  } catch (error) {
    const providerError = toProviderError(
      ProviderType.GoogleBusinessProfile,
      error
    );
    await writeAuditLog({
      actorUserId: access.user.id,
      organizationId: access.org.id,
      action: "reviews.sync_failed",
      targetType: "location",
      targetId: parsed.data.locationId,
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

export async function replyGoogleReviewAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
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

  const access = await requireLocationAccess(parsed.data.locationId);
  if ("error" in access) {
    return { error: access.error, success: null };
  }

  try {
    await replyGoogleReviewForLocation({
      organizationId: access.org.id,
      locationId: parsed.data.locationId,
      actorUserId: access.user.id,
      reviewId: parsed.data.reviewId,
      replyText: parsed.data.replyText,
    });
    revalidatePath(`/app/locations/${parsed.data.locationId}`);
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
      targetId: parsed.data.reviewId,
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
