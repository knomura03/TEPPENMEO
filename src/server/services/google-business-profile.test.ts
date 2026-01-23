import { beforeEach, describe, expect, it } from "vitest";

import {
  publishGooglePostTarget,
  retryGooglePostTarget,
} from "@/server/services/google-business-profile";
import { resetEnvForTests } from "@/server/utils/env";

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.PROVIDER_MOCK_MODE = "true";
  resetEnvForTests();
});

describe("GBP投稿", () => {
  it("モック投稿は成功する", async () => {
    const result = await publishGooglePostTarget({
      organizationId: "org-1",
      locationId: "loc-1",
      postId: "post-1",
      content: "テスト投稿",
      imageUrl: null,
      imagePath: null,
      actorUserId: "user-1",
    });
    expect(result.status).toBe("published");
  });

  it("GBPロケーション未設定は失敗する", async () => {
    const result = await publishGooglePostTarget({
      organizationId: "org-1",
      locationId: "loc-2",
      postId: "post-2",
      content: "テスト投稿",
      imageUrl: null,
      imagePath: null,
      actorUserId: "user-1",
    });
    expect(result.status).toBe("failed");
    expect(result.error?.cause).toContain("未設定");
  });
});

describe("GBP再実行", () => {
  it("モック再実行は成功する", async () => {
    const result = await retryGooglePostTarget({
      organizationId: "org-1",
      locationId: "loc-1",
      postId: "post-3",
      content: "再実行テスト",
      media: [],
      actorUserId: "user-1",
    });
    expect(result.status).toBe("published");
  });
});
