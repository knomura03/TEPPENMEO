import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveGbpLinkedLocations,
  runGbpBulkReviewSync,
} from "@/server/services/jobs/gbp-bulk-review-sync";
import { ProviderType } from "@/server/providers/types";
import { listLocations } from "@/server/services/locations";
import { listLocationProviderLinks } from "@/server/services/location-provider-links";
import { syncGoogleReviews } from "@/server/services/google-business-profile";
import { isProviderMockMode } from "@/server/utils/feature-flags";
import {
  createJobRun,
  finalizeJobRun,
  insertJobRunItems,
} from "@/server/services/jobs/job-runs";
import { writeAuditLog } from "@/server/services/audit-logs";

vi.mock("@/server/services/locations", () => ({
  listLocations: vi.fn(),
}));

vi.mock("@/server/services/location-provider-links", () => ({
  listLocationProviderLinks: vi.fn(),
}));

vi.mock("@/server/services/google-business-profile", () => ({
  syncGoogleReviews: vi.fn(),
}));

vi.mock("@/server/utils/feature-flags", () => ({
  isProviderMockMode: vi.fn(),
}));

vi.mock("@/server/services/jobs/job-runs", () => ({
  createJobRun: vi.fn(),
  finalizeJobRun: vi.fn(),
  insertJobRunItems: vi.fn(),
}));

vi.mock("@/server/services/audit-logs", () => ({
  writeAuditLog: vi.fn(),
}));

const mockedListLocations = vi.mocked(listLocations);
const mockedListLinks = vi.mocked(listLocationProviderLinks);
const mockedSyncReviews = vi.mocked(syncGoogleReviews);
const mockedMockMode = vi.mocked(isProviderMockMode);
const mockedCreateJobRun = vi.mocked(createJobRun);
const mockedFinalizeJobRun = vi.mocked(finalizeJobRun);
const mockedInsertJobRunItems = vi.mocked(insertJobRunItems);
const mockedWriteAuditLog = vi.mocked(writeAuditLog);

beforeEach(() => {
  mockedListLocations.mockReset();
  mockedListLinks.mockReset();
  mockedSyncReviews.mockReset();
  mockedMockMode.mockReset();
  mockedCreateJobRun.mockReset();
  mockedFinalizeJobRun.mockReset();
  mockedInsertJobRunItems.mockReset();
  mockedWriteAuditLog.mockReset();
});

describe("GBP一括レビュー同期", () => {
  it("GBP紐付け済みロケーションだけを抽出できる", async () => {
    mockedListLocations.mockResolvedValue([
      { id: "loc-1", organizationId: "org-1", name: "A" },
      { id: "loc-2", organizationId: "org-1", name: "B" },
      { id: "loc-3", organizationId: "org-1", name: "C" },
    ]);
    mockedListLinks.mockResolvedValue([
      {
        id: "link-1",
        locationId: "loc-1",
        provider: ProviderType.GoogleBusinessProfile,
        externalLocationId: "ext-1",
        metadata: {},
      },
      {
        id: "link-2",
        locationId: "loc-3",
        provider: ProviderType.GoogleBusinessProfile,
        externalLocationId: "ext-2",
        metadata: {},
      },
    ]);

    const result = await resolveGbpLinkedLocations("org-1");

    expect(result).toEqual(["loc-1", "loc-3"]);
  });

  it("モックモードでは外部APIを呼ばない", async () => {
    mockedMockMode.mockReturnValue(true);
    mockedCreateJobRun.mockResolvedValue({
      ok: true,
      runId: "run-1",
      reason: null,
    });
    mockedFinalizeJobRun.mockResolvedValue();
    mockedInsertJobRunItems.mockResolvedValue();
    mockedWriteAuditLog.mockResolvedValue();
    mockedListLocations.mockResolvedValue([
      { id: "loc-1", organizationId: "org-1", name: "A" },
      { id: "loc-2", organizationId: "org-1", name: "B" },
    ]);
    mockedListLinks.mockResolvedValue([
      {
        id: "link-1",
        locationId: "loc-1",
        provider: ProviderType.GoogleBusinessProfile,
        externalLocationId: "ext-1",
        metadata: {},
      },
      {
        id: "link-2",
        locationId: "loc-2",
        provider: ProviderType.GoogleBusinessProfile,
        externalLocationId: "ext-2",
        metadata: {},
      },
    ]);

    const result = await runGbpBulkReviewSync({
      organizationId: "org-1",
      actorUserId: "user-1",
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("succeeded");
    expect(result.summary.totalLocations).toBe(2);
    expect(result.summary.successCount).toBe(2);
    expect(result.summary.failedCount).toBe(0);
    expect(result.summary.reviewCount).toBe(2);
    expect(result.summary.mockMode).toBe(true);
    expect(mockedSyncReviews).not.toHaveBeenCalled();
  });

  it("一部失敗はpartialで集計される", async () => {
    mockedMockMode.mockReturnValue(false);
    mockedCreateJobRun.mockResolvedValue({
      ok: true,
      runId: "run-1",
      reason: null,
    });
    mockedFinalizeJobRun.mockResolvedValue();
    mockedInsertJobRunItems.mockResolvedValue();
    mockedWriteAuditLog.mockResolvedValue();
    mockedListLocations.mockResolvedValue([
      { id: "loc-1", organizationId: "org-1", name: "A" },
      { id: "loc-2", organizationId: "org-1", name: "B" },
    ]);
    mockedListLinks.mockResolvedValue([
      {
        id: "link-1",
        locationId: "loc-1",
        provider: ProviderType.GoogleBusinessProfile,
        externalLocationId: "ext-1",
        metadata: {},
      },
      {
        id: "link-2",
        locationId: "loc-2",
        provider: ProviderType.GoogleBusinessProfile,
        externalLocationId: "ext-2",
        metadata: {},
      },
    ]);
    mockedSyncReviews
      .mockResolvedValueOnce(2)
      .mockRejectedValueOnce(new Error("同期失敗"));

    const result = await runGbpBulkReviewSync({
      organizationId: "org-1",
      actorUserId: "user-1",
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("partial");
    expect(result.summary.successCount).toBe(1);
    expect(result.summary.failedCount).toBe(1);
    expect(result.summary.reviewCount).toBe(2);

    const items = mockedInsertJobRunItems.mock.calls[0]?.[1] ?? [];
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ status: "failed" });
  });
});
