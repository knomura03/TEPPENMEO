import { beforeEach, describe, expect, it, vi } from "vitest";

import { runSchedulerTick } from "@/server/services/jobs/scheduler";
import {
  listDueJobSchedules,
  updateJobScheduleTiming,
} from "@/server/services/jobs/job-schedules";
import { hasRunningJobRun } from "@/server/services/jobs/job-runs";
import { runGbpBulkReviewSync } from "@/server/services/jobs/gbp-bulk-review-sync";

vi.mock("@/server/services/jobs/job-schedules", () => ({
  listDueJobSchedules: vi.fn(),
  updateJobScheduleTiming: vi.fn(),
  normalizeCadenceMinutes: (value: number | null | undefined) => value ?? 1440,
}));

vi.mock("@/server/services/jobs/job-runs", () => ({
  hasRunningJobRun: vi.fn(),
}));

vi.mock("@/server/services/jobs/gbp-bulk-review-sync", () => ({
  GBP_BULK_REVIEW_SYNC_JOB_KEY: "gbp_reviews_bulk_sync",
  runGbpBulkReviewSync: vi.fn(),
}));

vi.mock("@/server/utils/feature-flags", () => ({
  isProviderMockMode: vi.fn(() => true),
}));

const mockedListDue = vi.mocked(listDueJobSchedules);
const mockedUpdateTiming = vi.mocked(updateJobScheduleTiming);
const mockedHasRunning = vi.mocked(hasRunningJobRun);
const mockedRunSync = vi.mocked(runGbpBulkReviewSync);

beforeEach(() => {
  mockedListDue.mockReset();
  mockedUpdateTiming.mockReset();
  mockedHasRunning.mockReset();
  mockedRunSync.mockReset();
});

describe("scheduler tick", () => {
  it("期限到来のスケジュールを実行し、次回日時を更新する", async () => {
    const now = new Date("2024-01-01T00:00:00Z");
    mockedListDue.mockResolvedValue({
      ok: true,
      reason: null,
      schedules: [
        {
          id: "sch-1",
          organizationId: "org-1",
          jobKey: "gbp_reviews_bulk_sync",
          enabled: true,
          cadenceMinutes: 360,
          nextRunAt: now.toISOString(),
          lastEnqueuedAt: null,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
    });
    mockedHasRunning.mockResolvedValue(false);
    mockedRunSync.mockResolvedValue({
      ok: true,
      status: "succeeded",
      summary: {},
      items: [],
      message: "ok",
      reason: null,
    });
    mockedUpdateTiming.mockResolvedValue({ ok: true, reason: null });

    const result = await runSchedulerTick({ now });

    expect(result.ok).toBe(true);
    expect(result.startedCount).toBe(1);
    const nextRun = mockedUpdateTiming.mock.calls[0]?.[0].nextRunAt;
    expect(nextRun).toBe("2024-01-01T06:00:00.000Z");
  });

  it("実行中ならスキップする", async () => {
    const now = new Date("2024-01-02T00:00:00Z");
    mockedListDue.mockResolvedValue({
      ok: true,
      reason: null,
      schedules: [
        {
          id: "sch-1",
          organizationId: "org-1",
          jobKey: "gbp_reviews_bulk_sync",
          enabled: true,
          cadenceMinutes: 360,
          nextRunAt: now.toISOString(),
          lastEnqueuedAt: null,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
    });
    mockedHasRunning.mockResolvedValue(true);

    const result = await runSchedulerTick({ now });

    expect(result.ok).toBe(true);
    expect(result.skippedCount).toBe(1);
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("取得に失敗した場合はok=falseを返す", async () => {
    mockedListDue.mockResolvedValue({
      ok: false,
      reason: "job_schedules が未適用です。",
      schedules: [],
    });

    const result = await runSchedulerTick();

    expect(result.ok).toBe(false);
    expect(result.message).toContain("job_schedules");
  });
});
