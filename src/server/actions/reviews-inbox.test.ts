import { beforeEach, describe, expect, it, vi } from "vitest";

import { replyReviewFromInboxAction } from "@/server/actions/reviews-inbox";
import { resetEnvForTests } from "@/server/utils/env";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.PROVIDER_MOCK_MODE;
  resetEnvForTests();
});

describe("レビュー受信箱の返信", () => {
  it("Googleレビューはモックで返信できる", async () => {
    const formData = new FormData();
    formData.set("locationId", "loc-1");
    formData.set("reviewId", "review-1");
    formData.set("replyText", "ご利用ありがとうございます。");

    const result = await replyReviewFromInboxAction(
      { error: null, success: null },
      formData
    );

    expect(result.error).toBeNull();
    expect(result.success).toBeTruthy();
  });

  it("Google以外は返信できない", async () => {
    const formData = new FormData();
    formData.set("locationId", "loc-2");
    formData.set("reviewId", "review-2");
    formData.set("replyText", "ありがとうございます。");

    const result = await replyReviewFromInboxAction(
      { error: null, success: null },
      formData
    );

    expect(result.success).toBeNull();
    expect(result.error?.cause).toContain("Googleレビュー以外");
  });
});
