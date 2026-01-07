import { ProviderError } from "@/server/providers/errors";
import { ProviderAccount, ProviderType } from "@/server/providers/types";
import {
  fetchMetaPageDetails,
  listMetaPages,
  publishFacebookPost,
  publishInstagramPost,
} from "@/server/providers/meta/api";
import { exchangeForLongLivedToken } from "@/server/providers/meta/oauth";
import { writeAuditLog } from "@/server/services/audit-logs";
import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import {
  buildStorageReference,
  createSignedImageUrl,
  createSignedImageUrlForPath,
  getMediaConfig,
  isMediaError,
  type MediaItem,
} from "@/server/services/media";
import {
  deleteLocationProviderLink,
  getLocationProviderLink,
  upsertLocationProviderLink,
} from "@/server/services/location-provider-links";
import {
  getProviderAccount,
  markProviderError,
  upsertProviderAccount,
} from "@/server/services/provider-accounts";
import {
  createPostRecord,
  createPostTargetRecord,
  updatePostStatus,
  updatePostTargetRecord,
} from "@/server/services/posts";
import { decryptSecret, encryptSecret } from "@/server/utils/crypto";
import { isMockMode } from "@/server/utils/feature-flags";

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export type UiError = {
  cause: string;
  nextAction: string;
};

export type MetaPageCandidate = {
  id: string;
  name: string;
  instagram?: {
    id: string;
    username?: string | null;
  } | null;
};

export function toUiError(error: ProviderError): UiError {
  if (error.code === "auth_required") {
    return {
      cause: error.message,
      nextAction: "Metaの再接続を実行してください。",
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
      nextAction: "入力内容と紐付け状態を確認してください。",
    };
  }
  if (error.code === "upstream_error") {
    return {
      cause: error.message,
      nextAction: "時間をおいて再実行してください。",
    };
  }
  return {
    cause: "予期しないエラーが発生しました。",
    nextAction: "時間をおいて再実行してください。",
  };
}

async function ensureMetaAccessToken(params: {
  organizationId: string;
  actorUserId?: string | null;
}): Promise<{ accessToken: string; account: ProviderAccount | null }> {
  if (isMockMode()) {
    return {
      accessToken: "mock-meta-access",
      account: {
        provider: ProviderType.Meta,
        auth: { accessToken: "mock-meta-access" },
      },
    };
  }

  const record = await getProviderAccount(params.organizationId, ProviderType.Meta);
  if (!record || !record.tokenEncrypted) {
    throw new ProviderError(
      ProviderType.Meta,
      "auth_required",
      "Metaアカウントが未接続です。"
    );
  }

  const metadata = record.metadata ?? {};
  if (metadata.reauth_required) {
    throw new ProviderError(
      ProviderType.Meta,
      "auth_required",
      "再認可が必要です。Metaで再接続してください。"
    );
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(record.tokenEncrypted);
  } catch {
    throw new ProviderError(
      ProviderType.Meta,
      "auth_required",
      "認証情報の復号に失敗しました。再接続してください。"
    );
  }

  if (record.expiresAt) {
    const expiresAt = new Date(record.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt - Date.now() <= REFRESH_THRESHOLD_MS) {
      try {
        const refreshed = await exchangeForLongLivedToken({ accessToken });
        const updated = await upsertProviderAccount(
          params.organizationId,
          ProviderType.Meta,
          {
            tokenEncrypted: encryptSecret(refreshed.access_token),
            expiresAt: refreshed.expires_in
              ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
              : record.expiresAt,
            metadata: { reauth_required: false, last_error: null },
          }
        );
        if (updated?.tokenEncrypted) {
          accessToken = decryptSecret(updated.tokenEncrypted);
        }
      } catch {
        const message = "認証の更新に失敗しました。Metaで再接続してください。";
        await markProviderError(params.organizationId, ProviderType.Meta, message, true);
        await writeAuditLog({
          actorUserId: params.actorUserId ?? null,
          organizationId: params.organizationId,
          action: "provider.reauth_required",
          targetType: "provider",
          targetId: ProviderType.Meta,
          metadata: { reason: "refresh_failed" },
        });
        throw new ProviderError(ProviderType.Meta, "auth_required", message);
      }
    }
  }

  return {
    accessToken,
    account: {
      provider: ProviderType.Meta,
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

export async function listMetaPageCandidates(params: {
  organizationId: string;
  actorUserId?: string | null;
}): Promise<MetaPageCandidate[]> {
  if (isMockMode()) {
    return [
      {
        id: "meta-page-1",
        name: "TEPPEN 公式ページ",
        instagram: { id: "ig-1", username: "teppen_official" },
      },
      {
        id: "meta-page-2",
        name: "TEPPEN 渋谷店",
        instagram: null,
      },
    ];
  }

  const { accessToken } = await ensureMetaAccessToken(params);
  const pages = await listMetaPages(accessToken);
  return pages.map((page) => {
    const instagram =
      page.instagram_business_account ?? page.connected_instagram_account ?? null;
    return {
      id: page.id,
      name: page.name,
      instagram: instagram
        ? { id: instagram.id, username: instagram.username }
        : null,
    };
  });
}

export async function linkMetaPage(params: {
  organizationId: string;
  locationId: string;
  actorUserId?: string | null;
  pageId: string;
  pageName: string;
  instagramId?: string | null;
  instagramUsername?: string | null;
}) {
  const link = await upsertLocationProviderLink({
    locationId: params.locationId,
    provider: ProviderType.Meta,
    externalLocationId: params.pageId,
    metadata: {
      page_name: params.pageName,
      instagram_business_account_id: params.instagramId ?? null,
      instagram_username: params.instagramUsername ?? null,
      linked_at: new Date().toISOString(),
    },
  });

  await writeAuditLog({
    actorUserId: params.actorUserId ?? null,
    organizationId: params.organizationId,
    action: "provider.link_location",
    targetType: "location",
    targetId: params.locationId,
    metadata: {
      provider: ProviderType.Meta,
      external_location_id: params.pageId,
    },
  });

  return link;
}

export async function unlinkMetaPage(params: {
  organizationId: string;
  locationId: string;
  actorUserId?: string | null;
}) {
  await deleteLocationProviderLink({
    locationId: params.locationId,
    provider: ProviderType.Meta,
  });

  await writeAuditLog({
    actorUserId: params.actorUserId ?? null,
    organizationId: params.organizationId,
    action: "provider.unlink_location",
    targetType: "location",
    targetId: params.locationId,
    metadata: { provider: ProviderType.Meta },
  });
}

type PublishTarget = "facebook" | "instagram";

export type MetaPublishResult = {
  postId?: string;
  successTargets: PublishTarget[];
  failedTargets: Array<{ target: PublishTarget; error: ProviderError }>;
};

function resolveInstagramAccountId(
  linkMetadata: Record<string, unknown>,
  fallback?: { id: string } | null
): string | null {
  const candidate =
    (linkMetadata.instagram_business_account_id as string | undefined) ??
    (linkMetadata.instagram_id as string | undefined) ??
    fallback?.id;
  return candidate ?? null;
}

export async function publishMetaPost(params: {
  organizationId: string;
  locationId: string;
  actorUserId?: string | null;
  content: string;
  imageUrl?: string | null;
  imagePath?: string | null;
  publishFacebook: boolean;
  publishInstagram: boolean;
}): Promise<MetaPublishResult> {
  const mediaRefs: string[] = [];
  let publishImageUrl = params.imageUrl ?? null;

  if (params.imagePath) {
    if (isMockMode()) {
      mediaRefs.push(buildStorageReference("mock", params.imagePath));
      publishImageUrl = params.imageUrl ?? "/fixtures/mock-upload.png";
    } else {
      try {
        const { bucket, signedUrl } = await createSignedImageUrlForPath(
          params.imagePath
        );
        mediaRefs.push(buildStorageReference(bucket, params.imagePath));
        publishImageUrl = signedUrl;
      } catch (error) {
        if (isMediaError(error)) {
          throw new ProviderError(ProviderType.Meta, "validation_error", error.cause);
        }
        throw new ProviderError(
          ProviderType.Meta,
          "upstream_error",
          "画像URLの準備に失敗しました。"
        );
      }
    }
  } else if (params.imageUrl) {
    mediaRefs.push(params.imageUrl);
  }

  const targets: PublishTarget[] = [];
  if (params.publishFacebook) targets.push("facebook");
  if (params.publishInstagram) targets.push("instagram");

  if (targets.length === 0) {
    throw new ProviderError(
      ProviderType.Meta,
      "validation_error",
      "投稿先が選択されていません。"
    );
  }

  const link = await getLocationProviderLink(params.locationId, ProviderType.Meta);
  if (!link) {
    throw new ProviderError(
      ProviderType.Meta,
      "validation_error",
      "Facebookページが未紐付けです。"
    );
  }

  const postRecord = await createPostRecord({
    organizationId: params.organizationId,
    locationId: params.locationId,
    content: params.content,
    media: mediaRefs,
    status: "queued",
  });

  const postId = postRecord?.id ?? null;

  if (isMockMode()) {
    for (const target of targets) {
      if (postId) {
        await createPostTargetRecord({
          postId,
          provider: ProviderType.Meta,
          status: "published",
          externalPostId: `${target}:mock`,
        });
      }
      await writeAuditLog({
        actorUserId: params.actorUserId ?? null,
        organizationId: params.organizationId,
        action: "posts.publish",
        targetType: "location",
        targetId: params.locationId,
        metadata: { provider: ProviderType.Meta, target, mocked: true },
      });
    }
    if (postId) {
      await updatePostStatus(postId, "published");
    }
    return { postId: postId ?? undefined, successTargets: targets, failedTargets: [] };
  }

  const { accessToken } = await ensureMetaAccessToken({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId ?? null,
  });

  const pageDetails = await fetchMetaPageDetails({
    accessToken,
    pageId: link.externalLocationId,
  });
  if (!pageDetails.accessToken) {
    throw new ProviderError(
      ProviderType.Meta,
      "auth_required",
      "Facebookページのトークン取得に失敗しました。再接続してください。"
    );
  }

  const successTargets: PublishTarget[] = [];
  const failedTargets: Array<{ target: PublishTarget; error: ProviderError }> = [];

  for (const target of targets) {
    const targetRecord = postId
      ? await createPostTargetRecord({
          postId,
          provider: ProviderType.Meta,
          status: "queued",
          externalPostId: `${target}:pending`,
        })
      : null;

    try {
      if (target === "facebook") {
        const response = await publishFacebookPost({
          pageId: link.externalLocationId,
          pageAccessToken: pageDetails.accessToken,
          content: params.content,
          imageUrl: publishImageUrl,
        });
        await updatePostTargetRecord({
          id: targetRecord?.id,
          status: "published",
          externalPostId: `${target}:${response.id}`,
        });
      } else {
        if (!publishImageUrl) {
          throw new ProviderError(
            ProviderType.Meta,
            "validation_error",
            "Instagram投稿は画像が必須です。"
          );
        }
        const instagramId = resolveInstagramAccountId(
          link.metadata,
          pageDetails.instagram
        );
        if (!instagramId) {
          throw new ProviderError(
            ProviderType.Meta,
            "validation_error",
            "Instagram連携が見つかりません。ページとInstagramを連携してください。"
          );
        }
        const response = await publishInstagramPost({
          instagramAccountId: instagramId,
          pageAccessToken: pageDetails.accessToken,
          caption: params.content,
          imageUrl: publishImageUrl,
        });
        await updatePostTargetRecord({
          id: targetRecord?.id,
          status: "published",
          externalPostId: `${target}:${response.id}`,
        });
      }

      successTargets.push(target);
      await writeAuditLog({
        actorUserId: params.actorUserId ?? null,
        organizationId: params.organizationId,
        action: "posts.publish",
        targetType: "location",
        targetId: params.locationId,
        metadata: { provider: ProviderType.Meta, target },
      });
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(
              ProviderType.Meta,
              "unknown",
              "投稿に失敗しました。"
            );
      failedTargets.push({ target, error: providerError });

      if (providerError.code === "auth_required") {
        await markProviderError(
          params.organizationId,
          ProviderType.Meta,
          providerError.message,
          providerError.status === 401
        );
      }

      await updatePostTargetRecord({
        id: targetRecord?.id,
        status: "failed",
        error: providerError.message,
        externalPostId: `${target}:failed`,
      });

      await writeAuditLog({
        actorUserId: params.actorUserId ?? null,
        organizationId: params.organizationId,
        action: "posts.publish_failed",
        targetType: "location",
        targetId: params.locationId,
        metadata: { provider: ProviderType.Meta, target, reason: providerError.message },
      });
    }
  }

  if (postId) {
    const status = successTargets.length > 0 ? "published" : "failed";
    await updatePostStatus(postId, status);
  }

  return { postId: postId ?? undefined, successTargets, failedTargets };
}

async function resolveRetryImageUrl(media: MediaItem[]): Promise<string | null> {
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
        ProviderType.Meta,
        "validation_error",
        error.cause
      );
    }
    throw new ProviderError(
      ProviderType.Meta,
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

async function findMetaTargetRecordId(params: {
  postId: string;
  target: PublishTarget;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("post_targets")
    .select("id, external_post_id")
    .eq("post_id", params.postId)
    .eq("provider", ProviderType.Meta)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return null;

  const matched = data.find((row) =>
    typeof row.external_post_id === "string"
      ? row.external_post_id.startsWith(`${params.target}:`)
      : false
  );

  return (matched ?? data[0])?.id ?? null;
}

export async function retryMetaPostTarget(params: {
  organizationId: string;
  locationId: string;
  postId: string;
  target: PublishTarget;
  content: string;
  media: MediaItem[];
  actorUserId?: string | null;
}): Promise<{ status: "published" | "failed"; externalPostId?: string | null; error?: UiError | null }> {
  if (isMockMode()) {
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.retry",
      targetType: "post",
      targetId: params.postId,
      metadata: { provider: ProviderType.Meta, target: params.target, mocked: true },
    });
    return {
      status: "published",
      externalPostId: `${params.target}:mock-retry`,
      error: null,
    };
  }

  const link = await getLocationProviderLink(params.locationId, ProviderType.Meta);
  if (!link) {
    return {
      status: "failed",
      error: {
        cause: "Facebookページが未紐付けです。",
        nextAction: "Facebookページを紐付けてから再実行してください。",
      },
    };
  }

  let publishImageUrl: string | null = null;
  try {
    publishImageUrl = await resolveRetryImageUrl(params.media);
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError(
            ProviderType.Meta,
            "unknown",
            "画像URLの準備に失敗しました。"
          );
    return { status: "failed", error: toUiError(providerError) };
  }

  if (params.target === "instagram" && !publishImageUrl) {
    return {
      status: "failed",
      error: {
        cause: "Instagram投稿は画像が必須です。",
        nextAction: "画像を指定してから再実行してください。",
      },
    };
  }

  let targetRecordId =
    (await findMetaTargetRecordId({
      postId: params.postId,
      target: params.target,
    })) ?? null;

  if (targetRecordId) {
    await updatePostTargetRecord({
      id: targetRecordId,
      status: "queued",
      externalPostId: `${params.target}:retry`,
      error: null,
    });
  } else {
    const created = await createPostTargetRecord({
      postId: params.postId,
      provider: ProviderType.Meta,
      status: "queued",
      externalPostId: `${params.target}:retry`,
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
    const { accessToken } = await ensureMetaAccessToken({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId ?? null,
    });

    const pageDetails = await fetchMetaPageDetails({
      accessToken,
      pageId: link.externalLocationId,
    });
    if (!pageDetails.accessToken) {
      throw new ProviderError(
        ProviderType.Meta,
        "auth_required",
        "Facebookページのトークン取得に失敗しました。再接続してください。"
      );
    }

    if (params.target === "facebook") {
      const response = await publishFacebookPost({
        pageId: link.externalLocationId,
        pageAccessToken: pageDetails.accessToken,
        content: params.content,
        imageUrl: publishImageUrl,
      });
      await updatePostTargetRecord({
        id: targetRecordId ?? undefined,
        status: "published",
        externalPostId: `${params.target}:${response.id}`,
        error: null,
      });
      await refreshPostStatus(params.postId);
      await writeAuditLog({
        actorUserId: params.actorUserId ?? null,
        organizationId: params.organizationId,
        action: "posts.retry",
        targetType: "post",
        targetId: params.postId,
        metadata: { provider: ProviderType.Meta, target: params.target },
      });
      return {
        status: "published",
        externalPostId: `${params.target}:${response.id}`,
        error: null,
      };
    }

    const instagramId = resolveInstagramAccountId(
      link.metadata,
      pageDetails.instagram
    );
    if (!instagramId) {
      throw new ProviderError(
        ProviderType.Meta,
        "validation_error",
        "Instagram連携が見つかりません。ページとInstagramを連携してください。"
      );
    }
    if (!publishImageUrl) {
      throw new ProviderError(
        ProviderType.Meta,
        "validation_error",
        "Instagram投稿は画像が必須です。"
      );
    }

    const response = await publishInstagramPost({
      instagramAccountId: instagramId,
      pageAccessToken: pageDetails.accessToken,
      caption: params.content,
      imageUrl: publishImageUrl,
    });
    await updatePostTargetRecord({
      id: targetRecordId ?? undefined,
      status: "published",
      externalPostId: `${params.target}:${response.id}`,
      error: null,
    });
    await refreshPostStatus(params.postId);
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.retry",
      targetType: "post",
      targetId: params.postId,
      metadata: { provider: ProviderType.Meta, target: params.target },
    });
    return {
      status: "published",
      externalPostId: `${params.target}:${response.id}`,
      error: null,
    };
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError(
            ProviderType.Meta,
            "unknown",
            "再実行に失敗しました。"
          );

    if (providerError.code === "auth_required") {
      await markProviderError(
        params.organizationId,
        ProviderType.Meta,
        providerError.message,
        providerError.status === 401
      );
    }

    await updatePostTargetRecord({
      id: targetRecordId ?? undefined,
      status: "failed",
      error: providerError.message,
      externalPostId: `${params.target}:failed`,
    });
    await refreshPostStatus(params.postId);
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "posts.retry_failed",
      targetType: "post",
      targetId: params.postId,
      metadata: { provider: ProviderType.Meta, target: params.target, reason: providerError.message },
    });
    return {
      status: "failed",
      externalPostId: `${params.target}:failed`,
      error: toUiError(providerError),
    };
  }
}
