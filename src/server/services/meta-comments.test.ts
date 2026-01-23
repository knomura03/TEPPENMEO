import { beforeEach, describe, expect, it } from "vitest";

import {
  formatMetaCommentExternalId,
  parseMetaCommentExternalId,
  syncMetaCommentsForOrganization,
} from "@/server/services/meta-comments";
import { resetEnvForTests } from "@/server/utils/env";

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.PROVIDER_MOCK_MODE = "true";
  resetEnvForTests();
});

describe("Metaコメント同期", () => {
  it("外部IDの変換ができる", () => {
    const value = formatMetaCommentExternalId("facebook", "123");
    expect(value).toBe("fb:123");
    expect(parseMetaCommentExternalId(value)).toEqual({
      channel: "facebook",
      id: "123",
    });
  });

  it("モックモードでコメント同期が成立する", async () => {
    const result = await syncMetaCommentsForOrganization({
      organizationId: "org-1",
      locationIds: ["loc-1", "loc-2"],
    });
    expect(result.total).toBeGreaterThan(0);
  });
});
