import { beforeEach, describe, expect, it } from "vitest";

import { ProviderType } from "@/server/providers/types";
import { listReviewsInboxPage } from "@/server/services/reviews-inbox";
import { resetEnvForTests } from "@/server/utils/env";

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.PROVIDER_MOCK_MODE;
  resetEnvForTests();
});

describe("レビュー受信箱の一覧", () => {
  it("ページングが動作する", async () => {
    const page = await listReviewsInboxPage({
      organizationId: "org-1",
      page: 1,
      pageSize: 1,
      filters: { query: "" },
    });
    expect(page.items.length).toBe(1);
    expect(page.total).toBeGreaterThan(1);
  });

  it("ロケーションで絞り込める", async () => {
    const page = await listReviewsInboxPage({
      organizationId: "org-1",
      filters: { locationId: "loc-2" },
    });
    expect(page.items.every((item) => item.locationId === "loc-2")).toBe(true);
  });

  it("プロバイダで絞り込める", async () => {
    const page = await listReviewsInboxPage({
      organizationId: "org-1",
      filters: { provider: ProviderType.Meta },
    });
    expect(page.items.every((item) => item.provider === ProviderType.Meta)).toBe(
      true
    );
  });

  it("自由検索が適用される", async () => {
    const page = await listReviewsInboxPage({
      organizationId: "org-1",
      filters: { query: "丁寧" },
    });
    expect(
      page.items.some((item) => (item.comment ?? "").includes("丁寧"))
    ).toBe(true);
  });
});
