import { describe, expect, it } from "vitest";

import { getMediaAssetSummary, recordMediaAsset } from "@/server/services/media-assets";
import { resetEnvForTests } from "@/server/utils/env";

describe("media assets", () => {
  it("Supabase未設定なら記録できない", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvForTests();

    const result = await recordMediaAsset({
      organizationId: "org-1",
      uploadedByUserId: "user-1",
      bucket: "media",
      path: "org/org-1/loc/loc-1/test.png",
      bytes: 123,
      mimeType: "image/png",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Supabase");
  });

  it("Supabase未設定なら集計できない", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvForTests();

    const summary = await getMediaAssetSummary("org-1");

    expect(summary.uploadedCount).toBeNull();
    expect(summary.reason).toContain("Supabase");
  });
});
