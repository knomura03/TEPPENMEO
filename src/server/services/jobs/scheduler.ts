import { GBP_BULK_REVIEW_SYNC_JOB_KEY, runGbpBulkReviewSync } from "@/server/services/jobs/gbp-bulk-review-sync";
import { hasRunningJobRun } from "@/server/services/jobs/job-runs";
import {
  listDueJobSchedules,
  normalizeCadenceMinutes,
  updateJobScheduleTiming,
} from "@/server/services/jobs/job-schedules";
import { isProviderMockMode } from "@/server/utils/feature-flags";

export type SchedulerTickResult = {
  ok: boolean;
  message: string;
  dueCount: number;
  startedCount: number;
  skippedCount: number;
  errorCount: number;
  mockMode: boolean;
  results: Array<{
    organizationId: string;
    status: "started" | "skipped" | "error";
    reason: string | null;
  }>;
};

export async function runSchedulerTick(params?: {
  now?: Date;
  limitOrganizations?: number;
}): Promise<SchedulerTickResult> {
  const now = params?.now ?? new Date();
  const dueResult = await listDueJobSchedules({
    jobKey: GBP_BULK_REVIEW_SYNC_JOB_KEY,
    now,
    limit: params?.limitOrganizations ?? 25,
  });

  if (!dueResult.ok) {
    return {
      ok: false,
      message: dueResult.reason ?? "スケジュールの取得に失敗しました。",
      dueCount: 0,
      startedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      mockMode: isProviderMockMode(),
      results: [],
    };
  }

  let startedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const results: SchedulerTickResult["results"] = [];

  for (const schedule of dueResult.schedules) {
    const running = await hasRunningJobRun({
      organizationId: schedule.organizationId,
      jobKey: schedule.jobKey,
    });

    if (running) {
      skippedCount += 1;
      results.push({
        organizationId: schedule.organizationId,
        status: "skipped",
        reason: "すでに実行中のジョブがあるためスキップしました。",
      });
      continue;
    }

    const run = await runGbpBulkReviewSync({
      organizationId: schedule.organizationId,
      actorUserId: null,
    });

    if (!run.ok) {
      errorCount += 1;
      results.push({
        organizationId: schedule.organizationId,
        status: "error",
        reason: run.reason ?? run.message,
      });
      continue;
    }

    startedCount += 1;
    results.push({
      organizationId: schedule.organizationId,
      status: "started",
      reason: null,
    });

    const cadenceMinutes = normalizeCadenceMinutes(schedule.cadenceMinutes);
    const nextRunAt = new Date(
      now.getTime() + cadenceMinutes * 60 * 1000
    ).toISOString();

    await updateJobScheduleTiming({
      organizationId: schedule.organizationId,
      jobKey: schedule.jobKey,
      nextRunAt,
      lastEnqueuedAt: now.toISOString(),
    });
  }

  return {
    ok: true,
    message: `対象 ${dueResult.schedules.length} 件を処理しました。`,
    dueCount: dueResult.schedules.length,
    startedCount,
    skippedCount,
    errorCount,
    mockMode: isProviderMockMode(),
    results,
  };
}
