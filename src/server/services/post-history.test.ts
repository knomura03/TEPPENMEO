import { beforeEach, describe, expect, it } from "vitest";

import {
  listPostHistoryPage,
  retryPostTarget,
} from "@/server/services/post-history";
import { resetEnvForTests } from "@/server/utils/env";

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.PROVIDER_MOCK_MODE;
  resetEnvForTests();
});

describe("投稿履歴のページング", () => {
  it("ページサイズに応じて分割される", async () => {
    const page = await listPostHistoryPage({
      organizationId: "org-1",
      locationId: "loc-1",
      page: 1,
      pageSize: 3,
      filters: { status: "all", target: "all", search: "" },
    });
    expect(page.items.length).toBe(3);
    expect(page.total).toBeGreaterThan(3);
  });

  it("状態フィルタが適用される", async () => {
    const page = await listPostHistoryPage({
      organizationId: "org-1",
      locationId: "loc-1",
      filters: { status: "failed", target: "all", search: "" },
    });
    expect(page.items.every((item) => item.status === "failed")).toBe(true);
  });

  it("本文検索が適用される", async () => {
    const page = await listPostHistoryPage({
      organizationId: "org-1",
      locationId: "loc-1",
      filters: { status: "all", target: "all", search: "週末" },
    });
    expect(page.items.some((item) => item.content.includes("週末"))).toBe(true);
  });

  it("対象フィルタが適用される", async () => {
    const page = await listPostHistoryPage({
      organizationId: "org-1",
      locationId: "loc-1",
      filters: { status: "all", target: "facebook", search: "" },
    });
    expect(
      page.items.every((item) =>
        item.targets.some((target) =>
          (target.externalPostId ?? "").startsWith("facebook:")
        )
      )
    ).toBe(true);
  });
});

describe("投稿履歴の再実行", () => {
  it("モックでは疑似的に成功する", async () => {
    const result = await retryPostTarget({
      organizationId: "org-1",
      locationId: "loc-1",
      postId: "post-2",
      target: "facebook",
      actorUserId: "user-1",
    });
    expect(result.status).toBe("published");
    expect(result.externalPostId).toContain("facebook");
  });
});
