import { ProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import {
  fetchMetaPageDetails,
  listFacebookComments,
  listInstagramComments,
  replyFacebookComment,
  replyInstagramComment,
} from "@/server/providers/meta/api";
import { writeAuditLog } from "@/server/services/audit-logs";
import { getLocationProviderLink, listLocationProviderLinks } from "@/server/services/location-provider-links";
import { getMetaAccessToken } from "@/server/services/meta";
import { upsertReviews } from "@/server/services/reviews";
import { createReviewReply } from "@/server/services/review-replies";
import { mockMetaComments } from "@/server/services/mock-data";
import { isMockMode } from "@/server/utils/feature-flags";

export type MetaCommentChannel = "facebook" | "instagram";

export type MetaCommentSyncResult = {
  total: number;
  reason?: string;
};

type MetaCommentRecord = {
  externalReviewId: string;
  locationId: string;
  author?: string | null;
  comment?: string | null;
  createdAt: string;
};

export type MetaCommentUiError = {
  cause: string;
  nextAction: string;
};

const META_PREFIX = {
  facebook: "fb:",
  instagram: "ig:",
} as const;

export function formatMetaCommentExternalId(
  channel: MetaCommentChannel,
  id: string
): string {
  return `${META_PREFIX[channel]}${id}`;
}

export function parseMetaCommentExternalId(value: string): {
  channel: MetaCommentChannel;
  id: string;
} | null {
  if (value.startsWith(META_PREFIX.facebook)) {
    return { channel: "facebook", id: value.slice(META_PREFIX.facebook.length) };
  }
  if (value.startsWith(META_PREFIX.instagram)) {
    return { channel: "instagram", id: value.slice(META_PREFIX.instagram.length) };
  }
  return null;
}

export function toMetaCommentUiError(error: ProviderError): MetaCommentUiError {
  if (error.code === "auth_required") {
    return {
      cause: error.message,
      nextAction: "連携サービスを再接続してください。",
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
      nextAction: "連携状態や店舗の紐付けを確認してください。",
    };
  }
  if (error.code === "not_supported") {
    return {
      cause: "このコメントは現在対応できません。",
      nextAction: "管理者に設定状況を確認してください。",
    };
  }
  return {
    cause: "コメント取得・返信に失敗しました。",
    nextAction: "時間をおいて再実行してください。",
  };
}

function buildMockCommentRecords(locationIds: string[]): MetaCommentRecord[] {
  return mockMetaComments.filter((item) => locationIds.includes(item.locationId));
}

export async function syncMetaCommentsForOrganization(params: {
  organizationId: string;
  locationIds: string[];
  actorUserId?: string | null;
}): Promise<MetaCommentSyncResult> {
  if (params.locationIds.length === 0) {
    return { total: 0, reason: "no_locations" };
  }

  const links = await listLocationProviderLinks({
    locationIds: params.locationIds,
    provider: ProviderType.Meta,
  });

  if (links.length === 0) {
    return { total: 0, reason: "no_links" };
  }

  if (isMockMode()) {
    const mockRecords = buildMockCommentRecords(params.locationIds);
    await upsertReviews(
      mockRecords.map((comment) => ({
        provider: ProviderType.Meta,
        externalReviewId: comment.externalReviewId,
        locationId: comment.locationId,
        author: comment.author ?? null,
        rating: null,
        comment: comment.comment ?? null,
        createdAt: comment.createdAt,
      }))
    );
    return { total: mockRecords.length };
  }

  const { accessToken } = await getMetaAccessToken({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
  });

  const records: MetaCommentRecord[] = [];

  for (const link of links) {
    const pageDetails = await fetchMetaPageDetails({
      accessToken,
      pageId: link.externalLocationId,
    });

    if (!pageDetails.accessToken) {
      throw new ProviderError(
        ProviderType.Meta,
        "auth_required",
        "Facebookページの権限が不足しています。"
      );
    }

    const facebookComments = await listFacebookComments({
      pageId: link.externalLocationId,
      pageAccessToken: pageDetails.accessToken,
    });

    facebookComments.forEach((comment) => {
      records.push({
        externalReviewId: formatMetaCommentExternalId("facebook", comment.id),
        locationId: link.locationId,
        author: comment.author ?? null,
        comment: comment.message ?? null,
        createdAt: comment.createdAt,
      });
    });

    const instagramId =
      (link.metadata?.instagram_business_account_id as string | undefined) ??
      pageDetails.instagram?.id ??
      null;

    if (instagramId) {
      const instagramComments = await listInstagramComments({
        instagramAccountId: instagramId,
        pageAccessToken: pageDetails.accessToken,
      });

      instagramComments.forEach((comment) => {
        records.push({
          externalReviewId: formatMetaCommentExternalId("instagram", comment.id),
          locationId: link.locationId,
          author: comment.author ?? null,
          comment: comment.message ?? null,
          createdAt: comment.createdAt,
        });
      });
    }
  }

  await upsertReviews(
    records.map((comment) => ({
      provider: ProviderType.Meta,
      externalReviewId: comment.externalReviewId,
      locationId: comment.locationId,
      author: comment.author ?? null,
      rating: null,
      comment: comment.comment ?? null,
      createdAt: comment.createdAt,
    }))
  );

  return { total: records.length };
}

export async function replyMetaCommentForLocation(params: {
  organizationId: string;
  locationId: string;
  actorUserId?: string | null;
  reviewId: string;
  externalReviewId: string;
  replyText: string;
}) {
  const parsed = parseMetaCommentExternalId(params.externalReviewId);
  if (!parsed) {
    throw new ProviderError(
      ProviderType.Meta,
      "validation_error",
      "コメントの種類を判別できません。"
    );
  }

  const link = await getLocationProviderLink(params.locationId, ProviderType.Meta);
  if (!link) {
    throw new ProviderError(
      ProviderType.Meta,
      "validation_error",
      "Facebookページの紐付けが必要です。"
    );
  }

  if (isMockMode()) {
    await createReviewReply({
      reviewId: params.reviewId,
      provider: ProviderType.Meta,
      replyText: params.replyText,
      status: "published",
    });
    await writeAuditLog({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      action: "reviews.reply",
      targetType: "review",
      targetId: params.reviewId,
      metadata: { provider: ProviderType.Meta, mocked: true, channel: parsed.channel },
    });
    return;
  }

  const { accessToken } = await getMetaAccessToken({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
  });

  const pageDetails = await fetchMetaPageDetails({
    accessToken,
    pageId: link.externalLocationId,
  });

  if (!pageDetails.accessToken) {
    throw new ProviderError(
      ProviderType.Meta,
      "auth_required",
      "Facebookページの権限が不足しています。"
    );
  }

  if (parsed.channel === "facebook") {
    await replyFacebookComment({
      commentId: parsed.id,
      pageAccessToken: pageDetails.accessToken,
      message: params.replyText,
    });
  } else {
    await replyInstagramComment({
      commentId: parsed.id,
      pageAccessToken: pageDetails.accessToken,
      message: params.replyText,
    });
  }

  await createReviewReply({
    reviewId: params.reviewId,
    provider: ProviderType.Meta,
    replyText: params.replyText,
    status: "published",
  });

  await writeAuditLog({
    actorUserId: params.actorUserId ?? null,
    organizationId: params.organizationId,
    action: "reviews.reply",
    targetType: "review",
    targetId: params.reviewId,
    metadata: { provider: ProviderType.Meta, channel: parsed.channel },
  });
}
