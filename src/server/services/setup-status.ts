import { ProviderType } from "@/server/providers/types";
import { listLocations } from "@/server/services/locations";
import { listProviderConnections } from "@/server/services/provider-connections";
import {
  countLocationProviderLinks,
  listLocationProviderLinks,
} from "@/server/services/location-provider-links";
import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import {
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/server/utils/env";
import {
  mockAuditLogs,
  mockPostHistory,
  mockReviews,
} from "@/server/services/mock-data";
import {
  listSetupProgress,
  setupStepKeys,
  type SetupProgressRecord,
} from "@/server/services/setup-progress";
import { getMediaConfig, isStorageConfigured } from "@/server/services/media";
import { getMediaAssetSummary } from "@/server/services/media-assets";
import { type MembershipRole, hasRequiredRole } from "@/server/auth/rbac";

type ProviderPostSummary = {
  total: number | null;
  failedCount: number | null;
  lastAt: string | null;
  lastStatus: string | null;
  reason: string | null;
};

type ProviderReviewSummary = {
  total: number | null;
  lastSyncAt: string | null;
  lastSyncStatus: "success" | "failed" | "unknown" | null;
  lastReplyAt: string | null;
  reason: string | null;
};

export type SetupStepStatus = {
  key: string;
  label: string;
  description: string;
  link: string;
  autoStatus: "done" | "not_done" | "unknown";
  autoReason: string | null;
  savedDone: boolean;
  savedAt: string | null;
  savedNote: string | null;
  effectiveDone: boolean;
};

export type SetupStatus = {
  locationsCount: number;
  providerConnected: {
    google: boolean;
    meta: boolean;
  };
  linkedCounts: {
    gbpLinked: number;
    metaLinked: number;
  };
  postsSummary: {
    google: ProviderPostSummary;
    meta: ProviderPostSummary;
  };
  reviewsSummary: {
    gbp: ProviderReviewSummary;
  };
  mediaSummary: {
    storageReady: boolean;
    signedUrlTtlSeconds: number;
    maxUploadMb: number;
    uploadedCount: number | null;
    lastUploadedAt: string | null;
    reason: string | null;
  };
  progress: {
    totalSteps: number;
    completedSteps: number;
    percent: number;
  };
  steps: SetupStepStatus[];
  saveAvailable: boolean;
  saveUnavailableReason: string | null;
  saveReadReason: string | null;
};

const stepDefinitions = [
  {
    key: "connect_google",
    label: "Google接続",
    description: "Googleアカウントを接続する",
    link: "/app/locations",
  },
  {
    key: "link_gbp_location",
    label: "GBPロケーション紐付け",
    description: "GoogleロケーションをTEPPENに紐付ける",
    link: "/app/locations",
  },
  {
    key: "post_test_google",
    label: "Google投稿テスト",
    description: "Googleへの投稿が成功するか確認する",
    link: "/app/locations",
  },
  {
    key: "connect_meta",
    label: "Meta接続",
    description: "Metaアカウントを接続する",
    link: "/app/locations",
  },
  {
    key: "link_fb_page",
    label: "Facebookページ紐付け",
    description: "FacebookページをTEPPENに紐付ける",
    link: "/app/locations",
  },
  {
    key: "post_test_meta",
    label: "Meta投稿テスト",
    description: "Facebook/Instagram投稿が成功するか確認する",
    link: "/app/locations",
  },
  {
    key: "enable_storage",
    label: "画像アップロード設定",
    description: "Storageを設定し画像投稿を有効化する",
    link: "/admin/diagnostics",
  },
] as const;

function buildPostSummary(reason: string | null): ProviderPostSummary {
  return {
    total: null,
    failedCount: null,
    lastAt: null,
    lastStatus: null,
    reason,
  };
}

async function getPostSummary(params: {
  organizationId: string;
  provider: ProviderType;
}): Promise<ProviderPostSummary> {
  if (!isSupabaseConfigured()) {
    const targets = mockPostHistory.flatMap((post) =>
      post.targets
        .filter((target) => target.provider === params.provider)
        .map((target) => ({
          status: target.status,
          createdAt: post.createdAt,
        }))
    );
    const total = targets.length;
    const failedCount = targets.filter((target) => target.status === "failed")
      .length;
    const latest = targets.sort((a, b) =>
      a.createdAt > b.createdAt ? -1 : 1
    )[0];
    return {
      total,
      failedCount,
      lastAt: latest?.createdAt ?? null,
      lastStatus: latest?.status ?? null,
      reason: null,
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return buildPostSummary(
      "SUPABASE_SERVICE_ROLE_KEY が未設定のため集計できません。"
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return buildPostSummary("Supabaseの設定を確認してください。");
  }

  try {
    const baseFilter = admin
      .from("post_targets")
      .select("id, posts!inner(organization_id)", { count: "exact", head: true })
      .eq("provider", params.provider)
      .eq("posts.organization_id", params.organizationId);

    const { count: totalCount, error: totalError } = await baseFilter;
    if (totalError) {
      return buildPostSummary(
        totalError.message ?? "投稿回数の集計に失敗しました。"
      );
    }

    const { count: failedCount, error: failedError } = await admin
      .from("post_targets")
      .select("id, posts!inner(organization_id)", { count: "exact", head: true })
      .eq("provider", params.provider)
      .eq("status", "failed")
      .eq("posts.organization_id", params.organizationId);

    if (failedError) {
      return buildPostSummary(
        failedError.message ?? "失敗件数の集計に失敗しました。"
      );
    }

    const { data: latest, error: latestError } = await admin
      .from("post_targets")
      .select("status, created_at, posts!inner(organization_id)")
      .eq("provider", params.provider)
      .eq("posts.organization_id", params.organizationId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (latestError) {
      return buildPostSummary(
        latestError.message ?? "最終投稿の取得に失敗しました。"
      );
    }

    const latestItem = latest?.[0] as { status?: string; created_at?: string } | undefined;

    return {
      total: totalCount ?? 0,
      failedCount: failedCount ?? 0,
      lastAt: latestItem?.created_at ?? null,
      lastStatus: latestItem?.status ?? null,
      reason: null,
    };
  } catch (error) {
    return buildPostSummary(
      error instanceof Error ? error.message : "投稿集計に失敗しました。"
    );
  }
}

async function getReviewSummary(params: {
  organizationId: string;
  locationIds: string[];
}): Promise<ProviderReviewSummary> {
  if (params.locationIds.length === 0) {
    return {
      total: 0,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastReplyAt: null,
      reason: null,
    };
  }

  if (!isSupabaseConfigured()) {
    const reviews = params.locationIds.flatMap((locationId) => {
      const locationReviews = mockReviews[locationId] ?? [];
      return locationReviews.filter(
        (review) => review.provider === ProviderType.GoogleBusinessProfile
      );
    });

    const mockSyncLog = [...mockAuditLogs]
      .filter(
        (log) =>
          log.action === "reviews.sync" ||
          log.action === "reviews.sync_failed"
      )
      .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];
    const lastSyncStatus = mockSyncLog
      ? mockSyncLog.action === "reviews.sync"
        ? "success"
        : "failed"
      : null;
    const lastSyncAt = mockSyncLog?.createdAt ?? null;

    return {
      total: reviews.length,
      lastSyncAt,
      lastSyncStatus,
      lastReplyAt: null,
      reason:
        lastSyncAt === null
          ? "モック運用のため同期履歴は未集計です。"
          : null,
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      total: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastReplyAt: null,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため集計できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      total: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastReplyAt: null,
      reason: "Supabaseの設定を確認してください。",
    };
  }

  const { count, error } = await admin
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("provider", ProviderType.GoogleBusinessProfile)
    .in("location_id", params.locationIds);

  if (error) {
    return {
      total: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastReplyAt: null,
      reason: "レビュー集計に失敗しました。",
    };
  }

  const links = await listLocationProviderLinks({
    locationIds: params.locationIds,
    provider: ProviderType.GoogleBusinessProfile,
  });
  const lastSyncAt = links
    .map((link) => link.metadata?.last_review_sync_at as string | undefined)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? null;

  const { data: syncData, error: syncError } = await admin
    .from("audit_logs")
    .select("action, created_at, metadata_json")
    .eq("organization_id", params.organizationId)
    .in("action", ["reviews.sync", "reviews.sync_failed"])
    .order("created_at", { ascending: false })
    .limit(10);

  let lastSyncStatus: ProviderReviewSummary["lastSyncStatus"] = null;
  let lastSyncLoggedAt: string | null = null;
  let syncReason: string | null = null;

  if (syncError) {
    syncReason = "同期履歴の取得に失敗しました。";
  } else {
    const candidate = (syncData ?? []).find((row) => {
      const metadata = (row as { metadata_json?: Record<string, unknown> })
        .metadata_json;
      const provider = metadata?.provider;
      return !provider || provider === ProviderType.GoogleBusinessProfile;
    });

    if (candidate) {
      lastSyncLoggedAt =
        (candidate as { created_at?: string }).created_at ?? null;
      lastSyncStatus =
        candidate.action === "reviews.sync" ? "success" : "failed";
    } else {
      syncReason = "同期履歴が見つかりません。";
    }
  }

  const resolvedSyncAt = lastSyncAt ?? lastSyncLoggedAt;

  const { data: replyData, error: replyError } = await admin
    .from("review_replies")
    .select("created_at, reviews!inner(location_id)")
    .eq("provider", ProviderType.GoogleBusinessProfile)
    .in("reviews.location_id", params.locationIds)
    .order("created_at", { ascending: false })
    .limit(1);

  if (replyError) {
    return {
      total: count ?? 0,
      lastSyncAt: resolvedSyncAt,
      lastSyncStatus,
      lastReplyAt: null,
      reason: "返信履歴の取得に失敗しました。",
    };
  }

  const latestReply = replyData?.[0] as { created_at?: string } | undefined;
  const lastReplyAt = latestReply?.created_at ?? null;
  const totalCount = count ?? 0;
  const reasonParts: string[] = [];

  if (syncReason) {
    reasonParts.push(syncReason);
  }

  const resolvedSyncStatus = lastSyncStatus;

  if (resolvedSyncAt === null && totalCount > 0) {
    reasonParts.push("最終同期日時が未記録のため不明です。");
  }
  if (resolvedSyncStatus === null && totalCount > 0) {
    reasonParts.push("直近の同期結果が未記録のため不明です。");
  }
  if (lastReplyAt === null && totalCount > 0) {
    reasonParts.push(
      "返信履歴が未記録のため不明です。返信を送ると記録されます。"
    );
  }

  return {
    total: totalCount,
    lastSyncAt: resolvedSyncAt,
    lastSyncStatus: resolvedSyncStatus,
    lastReplyAt,
    reason: reasonParts.length > 0 ? reasonParts.join(" ") : null,
  };
}

function resolveAutoStatus(value: boolean | null): {
  status: "done" | "not_done" | "unknown";
  reason: string | null;
} {
  if (value === null) {
    return { status: "unknown", reason: "集計できないため未判定です。" };
  }
  return { status: value ? "done" : "not_done", reason: null };
}

function mapProgress(records: SetupProgressRecord[]) {
  const map = new Map<string, SetupProgressRecord>();
  records.forEach((record) => map.set(record.stepKey, record));
  return map;
}

export async function getSetupStatus(params: {
  organizationId: string;
  actorUserId?: string | null;
  role: MembershipRole | null;
}): Promise<SetupStatus> {
  const locations = await listLocations(params.organizationId);
  const locationIds = locations.map((location) => location.id);
  const connections = await listProviderConnections(
    params.organizationId,
    params.actorUserId ?? null
  );
  const googleConnection =
    connections.find((item) => item.provider === ProviderType.GoogleBusinessProfile)
      ?.status ?? "not_connected";
  const metaConnection =
    connections.find((item) => item.provider === ProviderType.Meta)?.status ??
    "not_connected";

  const [googleLinked, metaLinked] = await Promise.all([
    countLocationProviderLinks({
      locationIds,
      provider: ProviderType.GoogleBusinessProfile,
    }),
    countLocationProviderLinks({
      locationIds,
      provider: ProviderType.Meta,
    }),
  ]);

  const [googlePosts, metaPosts] = await Promise.all([
    getPostSummary({
      organizationId: params.organizationId,
      provider: ProviderType.GoogleBusinessProfile,
    }),
    getPostSummary({
      organizationId: params.organizationId,
      provider: ProviderType.Meta,
    }),
  ]);

  const reviewsSummary = await getReviewSummary({
    organizationId: params.organizationId,
    locationIds,
  });

  const mediaConfig = getMediaConfig();
  const storageReady = isStorageConfigured();
  const mediaAssetSummary = await getMediaAssetSummary(params.organizationId);

  const progressResult = await listSetupProgress({
    organizationId: params.organizationId,
  });
  const progressMap = mapProgress(progressResult.records);

  const canManage = hasRequiredRole(params.role, "admin");
  const saveAvailable =
    canManage && isSupabaseConfigured() && isSupabaseAdminConfigured();
  const saveUnavailableReason = saveAvailable
    ? null
    : !canManage
      ? "組織管理者のみ完了チェックを保存できます。"
      : !isSupabaseConfigured()
        ? "Supabaseが未設定のため保存できません。"
        : "SUPABASE_SERVICE_ROLE_KEY が未設定のため保存できません。";

  const steps: SetupStepStatus[] = stepDefinitions.map((step) => {
    const record = progressMap.get(step.key);
    const autoValue = (() => {
      switch (step.key) {
        case "connect_google":
          return googleConnection === "connected";
        case "link_gbp_location":
          return googleLinked > 0;
        case "post_test_google":
          return googlePosts.total === null ? null : googlePosts.total > 0;
        case "connect_meta":
          return metaConnection === "connected";
        case "link_fb_page":
          return metaLinked > 0;
        case "post_test_meta":
          return metaPosts.total === null ? null : metaPosts.total > 0;
        case "enable_storage":
          return storageReady;
        default:
          return null;
      }
    })();
    const autoStatus = resolveAutoStatus(autoValue);
    const autoReason = (() => {
      if (autoStatus.status !== "unknown") return null;
      switch (step.key) {
        case "post_test_google":
          return googlePosts.reason ?? autoStatus.reason;
        case "post_test_meta":
          return metaPosts.reason ?? autoStatus.reason;
        case "link_gbp_location":
        case "link_fb_page":
          return locationIds.length === 0
            ? "ロケーションが未作成のため判定できません。"
            : autoStatus.reason;
        default:
          return autoStatus.reason;
      }
    })();
    const savedDone = record?.isDone ?? false;
    const effectiveDone = savedDone || autoStatus.status === "done";

    return {
      key: step.key,
      label: step.label,
      description: step.description,
      link: step.link,
      autoStatus: autoStatus.status,
      autoReason,
      savedDone,
      savedAt: record?.doneAt ?? null,
      savedNote: record?.note ?? null,
      effectiveDone,
    };
  });

  const totalSteps = setupStepKeys.length;
  const completedSteps = steps.filter((step) => step.effectiveDone).length;
  const percent = Math.round((completedSteps / totalSteps) * 100);

  return {
    locationsCount: locations.length,
    providerConnected: {
      google: googleConnection === "connected",
      meta: metaConnection === "connected",
    },
    linkedCounts: {
      gbpLinked: googleLinked,
      metaLinked: metaLinked,
    },
    postsSummary: {
      google: googlePosts,
      meta: metaPosts,
    },
    reviewsSummary: {
      gbp: reviewsSummary,
    },
    mediaSummary: {
      storageReady,
      signedUrlTtlSeconds: mediaConfig.signedUrlTtlSeconds,
      maxUploadMb: mediaConfig.maxUploadMb,
      uploadedCount: mediaAssetSummary.uploadedCount,
      lastUploadedAt: mediaAssetSummary.lastUploadedAt,
      reason: mediaAssetSummary.reason,
    },
    progress: {
      totalSteps,
      completedSteps,
      percent,
    },
    steps,
    saveAvailable,
    saveUnavailableReason,
    saveReadReason: progressResult.reason,
  };
}
