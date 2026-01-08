import { describe, expect, it } from "vitest";

import { getSetupStatus } from "@/server/services/setup-status";
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
  });
});
