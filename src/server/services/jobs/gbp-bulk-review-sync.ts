import { ProviderType } from "@/server/providers/types";
import { toProviderError } from "@/server/providers/errors";
import { listLocations } from "@/server/services/locations";
import { listLocationProviderLinks } from "@/server/services/location-provider-links";
import { syncGoogleReviews } from "@/server/services/google-business-profile";
import { isProviderMockMode } from "@/server/utils/feature-flags";
import { writeAuditLog } from "@/server/services/audit-logs";
import {
  createJobRun,
  finalizeJobRun,
  insertJobRunItems,
  type JobRunStatus,
  type JobRunSummary,
} from "@/server/services/jobs/job-runs";

export type BulkReviewSyncItem = {
  locationId: string;
  status: JobRunStatus;
  count: number;
  error?: string | null;
};

export type BulkReviewSyncResult = {
  ok: boolean;
  status: JobRunStatus;
  summary: JobRunSummary;
  items: BulkReviewSyncItem[];
  message: string;
  reason: string | null;
};

const JOB_KEY = "gbp_reviews_bulk_sync";

export async function resolveGbpLinkedLocations(organizationId: string) {
  const locations = await listLocations(organizationId);
  const locationIds = locations.map((location) => location.id);
  const links = await listLocationProviderLinks({
    locationIds,
    provider: ProviderType.GoogleBusinessProfile,
  });
  const linkedIds = new Set(links.map((link) => link.locationId));
  return locationIds.filter((id) => linkedIds.has(id));
}

export async function runGbpBulkReviewSync(params: {
  organizationId: string;
  actorUserId: string | null;
}): Promise<BulkReviewSyncResult> {
  const run = await createJobRun({
    organizationId: params.organizationId,
    jobKey: JOB_KEY,
    actorUserId: params.actorUserId,
  });

  if (!run.ok || !run.runId) {
    return {
      ok: false,
      status: "failed",
      summary: {},
      items: [],
      message: "一括同期を開始できませんでした。",
      reason: run.reason ?? "ジョブの開始に失敗しました。",
    };
  }

  await writeAuditLog({
    actorUserId: params.actorUserId,
    organizationId: params.organizationId,
    action: "reviews.bulk_sync_start",
    targetType: "job",
    targetId: run.runId,
    metadata: { job_key: JOB_KEY },
  });

  const linkedLocationIds = await resolveGbpLinkedLocations(
    params.organizationId
  );

  if (linkedLocationIds.length === 0) {
    const summary: JobRunSummary = {
      totalLocations: 0,
      successCount: 0,
      failedCount: 0,
      reviewCount: 0,
      mockMode: isProviderMockMode(),
    };

    await finalizeJobRun({
      runId: run.runId,
      status: "succeeded",
      summary,
    });

    await writeAuditLog({
      actorUserId: params.actorUserId,
      organizationId: params.organizationId,
      action: "reviews.bulk_sync",
      targetType: "job",
      targetId: run.runId,
      metadata: { job_key: JOB_KEY, summary },
    });

    return {
      ok: true,
      status: "succeeded",
      summary,
      items: [],
      message: "同期対象のロケーションがありません。",
      reason: null,
    };
  }

  const items: BulkReviewSyncItem[] = [];
  let successCount = 0;
  let failedCount = 0;
  let reviewCount = 0;

  for (const locationId of linkedLocationIds) {
    if (isProviderMockMode()) {
      const mockCount = 1;
      items.push({
        locationId,
        status: "succeeded",
        count: mockCount,
      });
      successCount += 1;
      reviewCount += mockCount;
      continue;
    }

    try {
      const count = await syncGoogleReviews({
        organizationId: params.organizationId,
        locationId,
        actorUserId: params.actorUserId ?? undefined,
      });
      items.push({
        locationId,
        status: "succeeded",
        count,
      });
      successCount += 1;
      reviewCount += count;
    } catch (error) {
      const providerError = toProviderError(
        ProviderType.GoogleBusinessProfile,
        error
      );
      items.push({
        locationId,
        status: "failed",
        count: 0,
        error: providerError.message,
      });
      failedCount += 1;
    }
  }

  const status: JobRunStatus =
    failedCount === 0
      ? "succeeded"
      : successCount === 0
        ? "failed"
        : "partial";

  const summary: JobRunSummary = {
    totalLocations: linkedLocationIds.length,
    successCount,
    failedCount,
    reviewCount,
    mockMode: isProviderMockMode(),
  };

  await insertJobRunItems(
    run.runId,
    items.map((item) => ({
      locationId: item.locationId,
      status: item.status,
      count: item.count,
      error: item.error ? { reason: item.error } : {},
    }))
  );

  await finalizeJobRun({
    runId: run.runId,
    status,
    summary,
    error: failedCount > 0 ? { failedCount } : {},
  });

  await writeAuditLog({
    actorUserId: params.actorUserId,
    organizationId: params.organizationId,
    action: "reviews.bulk_sync",
    targetType: "job",
    targetId: run.runId,
    metadata: { job_key: JOB_KEY, status, summary },
  });

  return {
    ok: true,
    status,
    summary,
    items,
    message:
      status === "succeeded"
        ? "一括同期が完了しました。"
        : status === "partial"
          ? "一部のロケーションで同期に失敗しました。"
          : "同期に失敗しました。",
    reason: failedCount > 0 ? "失敗したロケーションがあります。" : null,
  };
}

export const GBP_BULK_REVIEW_SYNC_JOB_KEY = JOB_KEY;
