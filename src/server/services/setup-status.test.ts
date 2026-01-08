import { describe, expect, it } from "vitest";

import { getSetupStatus } from "@/server/services/setup-status";
import { mockAuditLogs } from "@/server/services/mock-data";
import { resetEnvForTests } from "@/server/utils/env";

describe("setup status", () => {
  it("モック運用でも進捗を返す", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvForTests();

    const status = await getSetupStatus({
      organizationId: "org-1",
      actorUserId: "user-1",
      role: "owner",
    });

    expect(status.locationsCount).toBeGreaterThan(0);
    expect(status.progress.totalSteps).toBeGreaterThan(0);
    expect(status.steps.length).toBeGreaterThan(0);
    expect(status.saveAvailable).toBe(false);
    expect(status.mediaSummary.uploadedCount).toBeNull();
    expect(status.mediaSummary.reason).toContain("Supabase");
    expect(status.reviewsSummary.gbp.lastSyncStatus).toBe("failed");
  });

  it("同期履歴が無い場合は理由を返す", async () => {
    const originalLogs = [...mockAuditLogs];
    mockAuditLogs.length = 0;

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvForTests();

    try {
      const status = await getSetupStatus({
        organizationId: "org-1",
        actorUserId: "user-1",
        role: "owner",
      });

      expect(status.reviewsSummary.gbp.lastSyncStatus).toBeNull();
      expect(status.reviewsSummary.gbp.reason).toContain("同期履歴");
    } finally {
      mockAuditLogs.splice(0, mockAuditLogs.length, ...originalLogs);
    }
  });
});
