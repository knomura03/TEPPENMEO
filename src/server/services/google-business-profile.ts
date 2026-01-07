import { ProviderError } from "@/server/providers/errors";
import { ProviderAccount, ProviderType } from "@/server/providers/types";
import {
  createGooglePost,
  listGoogleLocations,
  listGoogleReviews,
  replyGoogleReview,
} from "@/server/providers/google_gbp/api";
import { refreshGoogleAccessToken } from "@/server/providers/google_gbp/oauth";
import { writeAuditLog } from "@/server/services/audit-logs";
import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { getLocationProviderLink, updateLocationProviderLinkMetadata, upsertLocationProviderLink } from "@/server/services/location-provider-links";
import { getProviderAccount, markProviderError, upsertProviderAccount } from "@/server/services/provider-accounts";
import { createPostTargetRecord, updatePostStatus, updatePostTargetRecord } from "@/server/services/posts";
import { getReviewById, upsertReviews } from "@/server/services/reviews";
import { createReviewReply } from "@/server/services/review-replies";
import { createSignedImageUrl, createSignedImageUrlForPath, getMediaConfig, isMediaError, type MediaItem } from "@/server/services/media";
import { decryptSecret, encryptSecret } from "@/server/utils/crypto";
import { isMockMode } from "@/server/utils/feature-flags";

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export type UiError = {
  cause: string;
  nextAction: string;
};

export function toUiError(error: ProviderError): UiError {
  if (error.code === "unknown") {
    return {
      cause: "予期しないエラーが発生しました。",
      nextAction: "時間をおいて再実行してください。",
    };
  }
  if (error.code === "auth_required") {
    return {
      cause: error.message,
      nextAction: "Googleの再接続またはAPI承認を行ってください。",
    };
  }
  if (error.code === "rate_limited") {
    return {
      cause: error.message,
      nextAction: "時間をおいて再実行してください。",
    };
  }
  if (error.code === "validation_error") {
    return {
      cause: error.message,
      nextAction: "入力内容または紐付け状態を確認してください。",
    };
  }
  return {
    cause: error.message,
    nextAction: "ログを確認し、必要なら再認可してください。",
  };
}

async function ensureGoogleAccessToken(params: {
  organizationId: string;
  actorUserId?: string | null;
}): Promise<{ accessToken: string; account: ProviderAccount | null }> {
  if (isMockMode()) {
    return {
      accessToken: "mock-google-access",
      account: {
        provider: ProviderType.GoogleBusinessProfile,
        auth: { accessToken: "mock-google-access" },
      },
    };
  }

  const record = await getProviderAccount(
    params.organizationId,
    ProviderType.GoogleBusinessProfile
  );
  if (!record || !record.tokenEncrypted) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "auth_required",
      "Googleアカウントが未接続です。"
    );
  }

  const metadata = record.metadata ?? {};
  if (metadata.reauth_required) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "auth_required",
      "再認可が必要です。Googleで再接続してください。"
    );
  }

  if (metadata.api_access === false) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "auth_required",
      "API承認が必要です。承認後に再接続してください。"
    );
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(record.tokenEncrypted);
  } catch {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "auth_required",
      "認証情報の復号に失敗しました。再接続してください。"
    );
  }

  if (record.expiresAt) {
    const expiresAt = new Date(record.expiresAt).getTime();
    const shouldRefresh =
      Number.isFinite(expiresAt) &&
      expiresAt - Date.now() <= REFRESH_THRESHOLD_MS;
    if (shouldRefresh) {
      if (!record.refreshTokenEncrypted) {
        const message =
          "認証の有効期限が近づいています。Googleで再接続してください。";
        await markProviderError(
          params.organizationId,
          ProviderType.GoogleBusinessProfile,
          message,
          true
        );
        await writeAuditLog({
          actorUserId: params.actorUserId ?? null,
          organizationId: params.organizationId,
          action: "provider.reauth_required",
          targetType: "provider",
          targetId: ProviderType.GoogleBusinessProfile,
          metadata: { reason: "refresh_token_missing" },
        });
        throw new ProviderError(
          ProviderType.GoogleBusinessProfile,
          "auth_required",
          message
        );
      }

      try {
        const refreshToken = decryptSecret(record.refreshTokenEncrypted);
        const refreshed = await refreshGoogleAccessToken({ refreshToken });
        const updated = await upsertProviderAccount(
          params.organizationId,
          ProviderType.GoogleBusinessProfile,
          {
            tokenEncrypted: encryptSecret(refreshed.access_token),
            refreshTokenEncrypted: refreshed.refresh_token
              ? encryptSecret(refreshed.refresh_token)
              : record.refreshTokenEncrypted,
            expiresAt: new Date(
              Date.now() + refreshed.expires_in * 1000
            ).toISOString(),
            scopes: refreshed.scope?.split(" ") ?? record.scopes,
            metadata: { reauth_required: false, last_error: null },
          }
        );
        if (updated?.tokenEncrypted) {
          accessToken = decryptSecret(updated.tokenEncrypted);
        }
      } catch {
        const message =
          "認証の更新に失敗しました。Googleで再接続してください。";
        await markProviderError(
          params.organizationId,
          ProviderType.GoogleBusinessProfile,
          message,
          true
        );
        await writeAuditLog({
          actorUserId: params.actorUserId ?? null,
          organizationId: params.organizationId,
          action: "provider.reauth_required",
          targetType: "provider",
          targetId: ProviderType.GoogleBusinessProfile,
          metadata: { reason: "refresh_failed" },
        });
        throw new ProviderError(
          ProviderType.GoogleBusinessProfile,
          "auth_required",
          message
        );
      }
    }
  }

  return {
    accessToken,
    account: {
      provider: ProviderType.GoogleBusinessProfile,
      externalAccountId: record.externalAccountId,
      displayName: record.displayName,
      auth: {
        accessToken,
        expiresAt: record.expiresAt ?? undefined,
        scopes: record.scopes,
      },
      metadata,
    },
  };
}

export async function listGoogleLocationCandidates(params: {
  organizationId: string;
  actorUserId?: string | null;
}) {
  if (isMockMode()) {
    return [
      {
        id: "google-location-1",
        name: "TEPPEN 渋谷",
        address: "東京都渋谷区渋谷1-2-3",
        lat: 35.6595,
        lng: 139.7005,
        metadata: { account_name: "TEPPEN デモアカウント" },
      },
    ];
  }

  const { accessToken } = await ensureGoogleAccessToken(params);
  return listGoogleLocations(accessToken);
}

export async function linkGoogleLocation(params: {
  organizationId: string;
  locationId: string;
  actorUserId?: string | null;
  externalLocationId: string;
  metadata: Record<string, unknown>;
}) {
  const link = await upsertLocationProviderLink({
    locationId: params.locationId,
    provider: ProviderType.GoogleBusinessProfile,
    externalLocationId: params.externalLocationId,
    metadata: params.metadata,
  });

  await writeAuditLog({
    actorUserId: params.actorUserId ?? null,
    organizationId: params.organizationId,
    action: "provider.link_location",
    targetType: "location",
    targetId: params.locationId,
    metadata: {
      provider: ProviderType.GoogleBusinessProfile,
      external_location_id: params.externalLocationId,
    },
  });

  return link;
}

export async function syncGoogleReviews(params: {
  organizationId: string;
  locationId: string;
  actorUserId?: string | null;
}) {
  const link = await getLocationProviderLink(
    params.locationId,
    ProviderType.GoogleBusinessProfile
  );
  if (!link) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "validation_error",
      "GBPロケーションが未紐付けです。"
    );
  }

  if (isMockMode()) {
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "reviews.sync",
      targetType: "location",
      targetId: params.locationId,
      metadata: { provider: ProviderType.GoogleBusinessProfile, mocked: true },
    });
    return 1;
  }

  const { accessToken } = await ensureGoogleAccessToken(params);
  const reviews = await listGoogleReviews(accessToken, link.externalLocationId);

  const upsertCount = await upsertReviews(
    reviews.map((review) => ({
      provider: ProviderType.GoogleBusinessProfile,
      externalReviewId: review.id,
      locationId: params.locationId,
      author: review.author,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    }))
  );

  await updateLocationProviderLinkMetadata({
    locationId: params.locationId,
    provider: ProviderType.GoogleBusinessProfile,
    metadata: {
      last_review_sync_at: new Date().toISOString(),
      last_review_sync_count: upsertCount,
    },
  });

  await writeAuditLog({
    actorUserId: params.actorUserId ?? null,
    organizationId: params.organizationId,
    action: "reviews.sync",
    targetType: "location",
    targetId: params.locationId,
    metadata: { provider: ProviderType.GoogleBusinessProfile, count: upsertCount },
  });

  return upsertCount;
}

export async function replyGoogleReviewForLocation(params: {
  organizationId: string;
  locationId: string;
  actorUserId?: string | null;
  reviewId: string;
  replyText: string;
}) {
  const review = await getReviewById(params.reviewId);
  if (!review) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "validation_error",
      "対象レビューが見つかりません。"
    );
  }

  const link = await getLocationProviderLink(
    params.locationId,
    ProviderType.GoogleBusinessProfile
  );
  if (!link) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "validation_error",
      "GBPロケーションが未紐付けです。"
    );
  }

  if (isMockMode()) {
    await createReviewReply({
      reviewId: params.reviewId,
      provider: ProviderType.GoogleBusinessProfile,
      replyText: params.replyText,
      status: "published",
    });
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "reviews.reply",
      targetType: "review",
      targetId: params.reviewId,
      metadata: { provider: ProviderType.GoogleBusinessProfile, mocked: true },
    });
    return;
  }

  const { accessToken } = await ensureGoogleAccessToken(params);
  await replyGoogleReview(accessToken, link.externalLocationId, review.externalReviewId, params.replyText);

  await createReviewReply({
    reviewId: params.reviewId,
    provider: ProviderType.GoogleBusinessProfile,
    replyText: params.replyText,
    status: "published",
  });

  await writeAuditLog({
    actorUserId: params.actorUserId ?? null,
    organizationId: params.organizationId,
    action: "reviews.reply",
    targetType: "review",
    targetId: params.reviewId,
    metadata: { provider: ProviderType.GoogleBusinessProfile },
  });
}

async function resolveGooglePublishImageUrl(params: {
  imageUrl?: string | null;
  imagePath?: string | null;
}): Promise<string | null> {
  if (params.imagePath) {
    if (isMockMode()) {
      return "/fixtures/mock-upload.png";
    }
    try {
      const { signedUrl } = await createSignedImageUrlForPath(params.imagePath);
      return signedUrl;
    } catch (error) {
      if (isMediaError(error)) {
        throw new ProviderError(
          ProviderType.GoogleBusinessProfile,
          "validation_error",
          error.cause
        );
      }
      throw new ProviderError(
        ProviderType.GoogleBusinessProfile,
        "upstream_error",
        "画像URLの準備に失敗しました。"
      );
    }
  }

  return params.imageUrl ?? null;
}

async function resolveGoogleRetryImageUrl(media: MediaItem[]): Promise<string | null> {
  const image = media.find((item) => item.kind === "image") ?? null;
  if (!image) return null;
  if (image.source === "url") return image.url;

  if (isMockMode()) {
    return "/fixtures/mock-upload.png";
  }

  try {
    const config = getMediaConfig();
    return await createSignedImageUrl(
      image.bucket,
      image.path,
      config.signedUrlTtlSeconds
    );
  } catch (error) {
    if (isMediaError(error)) {
      throw new ProviderError(
        ProviderType.GoogleBusinessProfile,
        "validation_error",
        error.cause
      );
    }
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "upstream_error",
      "画像URLの準備に失敗しました。"
    );
  }
}

async function refreshPostStatus(postId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { data } = await admin
    .from("post_targets")
    .select("status")
    .eq("post_id", postId);
  if (!data || data.length === 0) return;

  const statuses = data.map((row) => row.status as string);
  const nextStatus = statuses.every((status) => status === "published")
    ? "published"
    : statuses.some((status) => status === "failed")
    ? "failed"
    : "queued";

  await updatePostStatus(postId, nextStatus);
}

async function findGoogleTargetRecordId(postId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("post_targets")
    .select("id")
    .eq("post_id", postId)
    .eq("provider", ProviderType.GoogleBusinessProfile)
    .order("created_at", { ascending: false });

  return data?.[0]?.id ?? null;
}

export async function publishGooglePostTarget(params: {
  organizationId: string;
  locationId: string;
  postId: string;
  actorUserId?: string | null;
  content: string;
  imageUrl?: string | null;
  imagePath?: string | null;
}): Promise<{ status: "published" | "failed"; externalPostId?: string | null; error?: UiError | null }> {
  const link = await getLocationProviderLink(
    params.locationId,
    ProviderType.GoogleBusinessProfile
  );
  if (!link) {
    const providerError = new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "validation_error",
      "GBPロケーションが未紐付けです。"
    );
    const record = await createPostTargetRecord({
      postId: params.postId,
      provider: ProviderType.GoogleBusinessProfile,
      status: "failed",
      externalPostId: "google:failed",
      error: providerError.message,
    });
    await updatePostTargetRecord({
      id: record?.id,
      status: "failed",
      externalPostId: "google:failed",
      error: providerError.message,
    });
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.publish_failed",
      targetType: "location",
      targetId: params.locationId,
      metadata: { provider: ProviderType.GoogleBusinessProfile, reason: providerError.message },
    });
    return { status: "failed", externalPostId: "google:failed", error: toUiError(providerError) };
  }

  let publishImageUrl: string | null = null;
  try {
    publishImageUrl = await resolveGooglePublishImageUrl({
      imageUrl: params.imageUrl,
      imagePath: params.imagePath,
    });
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError(
            ProviderType.GoogleBusinessProfile,
            "unknown",
            "画像URLの準備に失敗しました。"
          );
    const record = await createPostTargetRecord({
      postId: params.postId,
      provider: ProviderType.GoogleBusinessProfile,
      status: "failed",
      externalPostId: "google:failed",
      error: providerError.message,
    });
    await updatePostTargetRecord({
      id: record?.id,
      status: "failed",
      externalPostId: "google:failed",
      error: providerError.message,
    });
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.publish_failed",
      targetType: "location",
      targetId: params.locationId,
      metadata: { provider: ProviderType.GoogleBusinessProfile, reason: providerError.message },
    });
    return { status: "failed", externalPostId: "google:failed", error: toUiError(providerError) };
  }

  const targetRecord = await createPostTargetRecord({
    postId: params.postId,
    provider: ProviderType.GoogleBusinessProfile,
    status: "queued",
    externalPostId: "google:pending",
  });

  if (isMockMode()) {
    await updatePostTargetRecord({
      id: targetRecord?.id,
      status: "published",
      externalPostId: "google:mock",
      error: null,
    });
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.publish",
      targetType: "location",
      targetId: params.locationId,
      metadata: { provider: ProviderType.GoogleBusinessProfile, mocked: true },
    });
    return { status: "published", externalPostId: "google:mock", error: null };
  }

  try {
    const { accessToken } = await ensureGoogleAccessToken({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId ?? null,
    });

    const response = await createGooglePost({
      accessToken,
      locationName: link.externalLocationId,
      summary: params.content,
      imageUrl: publishImageUrl,
    });

    await updatePostTargetRecord({
      id: targetRecord?.id,
      status: "published",
      externalPostId: response.id,
      error: null,
    });
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.publish",
      targetType: "location",
      targetId: params.locationId,
      metadata: { provider: ProviderType.GoogleBusinessProfile },
    });
    return { status: "published", externalPostId: response.id, error: null };
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError(
            ProviderType.GoogleBusinessProfile,
            "unknown",
            "投稿に失敗しました。"
          );

    if (providerError.code === "auth_required") {
      await markProviderError(
        params.organizationId,
        ProviderType.GoogleBusinessProfile,
        providerError.message,
        providerError.status === 401
      );
    }

    await updatePostTargetRecord({
      id: targetRecord?.id,
      status: "failed",
      externalPostId: "google:failed",
      error: providerError.message,
    });
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.publish_failed",
      targetType: "location",
      targetId: params.locationId,
      metadata: { provider: ProviderType.GoogleBusinessProfile, reason: providerError.message },
    });
    return { status: "failed", externalPostId: "google:failed", error: toUiError(providerError) };
  }
}

export async function retryGooglePostTarget(params: {
  organizationId: string;
  locationId: string;
  postId: string;
  actorUserId?: string | null;
  content: string;
  media: MediaItem[];
}): Promise<{ status: "published" | "failed"; externalPostId?: string | null; error?: UiError | null }> {
  if (isMockMode()) {
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.retry",
      targetType: "post",
      targetId: params.postId,
      metadata: { provider: ProviderType.GoogleBusinessProfile, mocked: true },
    });
    return { status: "published", externalPostId: "google:mock-retry", error: null };
  }

  const link = await getLocationProviderLink(
    params.locationId,
    ProviderType.GoogleBusinessProfile
  );
  if (!link) {
    return {
      status: "failed",
      error: {
        cause: "GBPロケーションが未紐付けです。",
        nextAction: "GBPロケーションを紐付けてから再実行してください。",
      },
    };
  }

  let publishImageUrl: string | null = null;
  try {
    publishImageUrl = await resolveGoogleRetryImageUrl(params.media);
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError(
            ProviderType.GoogleBusinessProfile,
            "unknown",
            "画像URLの準備に失敗しました。"
          );
    return { status: "failed", error: toUiError(providerError) };
  }

  let targetRecordId = await findGoogleTargetRecordId(params.postId);
  if (targetRecordId) {
    await updatePostTargetRecord({
      id: targetRecordId,
      status: "queued",
      externalPostId: "google:retry",
      error: null,
    });
  } else {
    const created = await createPostTargetRecord({
      postId: params.postId,
      provider: ProviderType.GoogleBusinessProfile,
      status: "queued",
      externalPostId: "google:retry",
    });
    if (!created?.id) {
      return {
        status: "failed",
        error: {
          cause: "再実行の準備に失敗しました。",
          nextAction: "時間をおいて再実行してください。",
        },
      };
    }
    targetRecordId = created.id;
  }

  try {
    const { accessToken } = await ensureGoogleAccessToken({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId ?? null,
    });

    const response = await createGooglePost({
      accessToken,
      locationName: link.externalLocationId,
      summary: params.content,
      imageUrl: publishImageUrl,
    });

    await updatePostTargetRecord({
      id: targetRecordId,
      status: "published",
      externalPostId: response.id,
      error: null,
    });
    await refreshPostStatus(params.postId);
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.retry",
      targetType: "post",
      targetId: params.postId,
      metadata: { provider: ProviderType.GoogleBusinessProfile },
    });
    return { status: "published", externalPostId: response.id, error: null };
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError(
            ProviderType.GoogleBusinessProfile,
            "unknown",
            "再実行に失敗しました。"
          );

    if (providerError.code === "auth_required") {
      await markProviderError(
        params.organizationId,
        ProviderType.GoogleBusinessProfile,
        providerError.message,
        providerError.status === 401
      );
    }

    await updatePostTargetRecord({
      id: targetRecordId,
      status: "failed",
      externalPostId: "google:failed",
      error: providerError.message,
    });
    await refreshPostStatus(params.postId);
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.retry_failed",
      targetType: "post",
      targetId: params.postId,
      metadata: { provider: ProviderType.GoogleBusinessProfile, reason: providerError.message },
    });
    return { status: "failed", externalPostId: "google:failed", error: toUiError(providerError) };
  }
}
