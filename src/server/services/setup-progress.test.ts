import { describe, expect, it } from "vitest";

import {
  isValidSetupStepKey,
  upsertSetupProgress,
} from "@/server/services/setup-progress";
import { resetEnvForTests } from "@/server/utils/env";

describe("setup progress", () => {
  it("ステップキーを検証できる", () => {
    expect(isValidSetupStepKey("connect_google")).toBe(true);
    expect(isValidSetupStepKey("unknown_step")).toBe(false);
  });

  it("Supabase未設定なら保存できない", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvForTests();

    const result = await upsertSetupProgress({
      organizationId: "org-1",
      stepKey: "connect_google",
      isDone: true,
      doneByUserId: "user-1",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Supabase");
  });
});
