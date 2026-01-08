import { describe, expect, it, vi, beforeEach } from "vitest";

import { ProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import {
  checkGoogleHealth,
  resolveProviderErrorHint,
} from "@/server/services/provider-health";
import { resetEnvForTests } from "@/server/utils/env";
import { listGoogleLocationCandidates } from "@/server/services/google-business-profile";
import { getProviderAccount } from "@/server/services/provider-accounts";

vi.mock("@/server/services/google-business-profile", () => ({
  listGoogleLocationCandidates: vi.fn(),
}));

vi.mock("@/server/services/provider-accounts", () => ({
  getProviderAccount: vi.fn(),
}));

const mockedListGoogle = vi.mocked(listGoogleLocationCandidates);
const mockedGetProviderAccount = vi.mocked(getProviderAccount);

beforeEach(() => {
  mockedListGoogle.mockReset();
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
});
