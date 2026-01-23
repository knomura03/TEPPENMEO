import { describe, expect, it, vi, beforeEach } from "vitest";

import { ProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import {
  checkGoogleHealth,
  checkMetaHealth,
  resolveProviderErrorHint,
} from "@/server/services/provider-health";
import { resetEnvForTests } from "@/server/utils/env";
import { listGoogleLocationCandidates } from "@/server/services/google-business-profile";
import { listMetaPageCandidates } from "@/server/services/meta";
import { listLocations } from "@/server/services/locations";
import { listLocationProviderLinks } from "@/server/services/location-provider-links";
import { getProviderAccount } from "@/server/services/provider-accounts";

vi.mock("@/server/services/google-business-profile", () => ({
  listGoogleLocationCandidates: vi.fn(),
}));

vi.mock("@/server/services/meta", () => ({
  listMetaPageCandidates: vi.fn(),
}));

vi.mock("@/server/services/locations", () => ({
  listLocations: vi.fn(),
}));

vi.mock("@/server/services/location-provider-links", () => ({
  listLocationProviderLinks: vi.fn(),
}));

vi.mock("@/server/services/provider-accounts", () => ({
  getProviderAccount: vi.fn(),
}));

const mockedListGoogle = vi.mocked(listGoogleLocationCandidates);
const mockedListMeta = vi.mocked(listMetaPageCandidates);
const mockedListLocations = vi.mocked(listLocations);
const mockedListLinks = vi.mocked(listLocationProviderLinks);
const mockedGetProviderAccount = vi.mocked(getProviderAccount);

beforeEach(() => {
  mockedListGoogle.mockReset();
  mockedListMeta.mockReset();
  mockedListLocations.mockReset();
  mockedListLinks.mockReset();
  mockedGetProviderAccount.mockReset();
});

describe("provider health", () => {
  it("モックモードでは外部APIを呼ばない", async () => {
    process.env.PROVIDER_MOCK_MODE = "true";
    resetEnvForTests();

    const result = await checkGoogleHealth({ organizationId: "org-1" });

    expect(result.status).toBe("warning");
    expect(mockedListGoogle).not.toHaveBeenCalled();
    expect(mockedGetProviderAccount).not.toHaveBeenCalled();
  });

  it("401は再認可の案内になる", () => {
    const hint = resolveProviderErrorHint(
      ProviderType.GoogleBusinessProfile,
      new ProviderError(
        ProviderType.GoogleBusinessProfile,
        "auth_required",
        "認証が無効です。",
        401
      )
    );
    expect(hint.status).toBe("warning");
    expect(hint.nextActions.join(" ")).toContain("再認可");
  });

  it("403は承認/権限の案内になる", () => {
    const hint = resolveProviderErrorHint(
      ProviderType.GoogleBusinessProfile,
      new ProviderError(
        ProviderType.GoogleBusinessProfile,
        "auth_required",
        "API承認が必要です。",
        403
      )
    );
    expect(hint.nextActions.join(" ")).toContain("API承認");
  });

  it("429はレート制限の案内になる", () => {
    const hint = resolveProviderErrorHint(
      ProviderType.Meta,
      new ProviderError(
        ProviderType.Meta,
        "rate_limited",
        "レート制限です。",
        429
      )
    );
    expect(hint.status).toBe("warning");
    expect(hint.nextActions.join(" ")).toContain("時間をおいて");
  });

  it("Metaコメントはページ紐付けがないと準備不足になる", async () => {
    process.env.PROVIDER_MOCK_MODE = "false";
    process.env.META_APP_ID = "meta-id";
    process.env.META_APP_SECRET = "meta-secret";
    process.env.META_REDIRECT_URI = "https://example.com/callback";
    resetEnvForTests();

    mockedGetProviderAccount.mockResolvedValue({
      tokenEncrypted: "token",
      metadata: {},
    } as unknown as Awaited<ReturnType<typeof getProviderAccount>>);
    mockedListMeta.mockResolvedValue([]);
    mockedListLocations.mockResolvedValue([
      { id: "loc-1", name: "店舗A", organizationId: "org-1" },
    ] as unknown as Awaited<ReturnType<typeof listLocations>>);
    mockedListLinks.mockResolvedValue([]);

    const result = await checkMetaHealth({ organizationId: "org-1" });
    const commentCheck = result.checks.find(
      (check) => check.name === "コメント取得準備"
    );

    expect(commentCheck?.ok).toBe(false);
    expect(result.blockedReason?.cause).toContain("Facebookページ");
  });
});
