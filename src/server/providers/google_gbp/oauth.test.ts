import { afterEach, describe, expect, it, vi } from "vitest";

import { refreshGoogleAccessToken } from "@/server/providers/google_gbp/oauth";
import { resetEnvForTests } from "@/server/utils/env";

function mockFetchOnce(response: { ok: boolean; status?: number; body: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 400),
    json: async () => response.body,
    text: async () => JSON.stringify(response.body),
  } as Response)));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Google OAuth refresh", () => {
  it("リフレッシュ成功時にアクセストークンを取得する", async () => {
    process.env.GOOGLE_CLIENT_ID = "client";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    resetEnvForTests();

    mockFetchOnce({
      ok: true,
      body: {
        access_token: "new-access",
        expires_in: 3600,
        scope: "scope1 scope2",
      },
    });

    const result = await refreshGoogleAccessToken({
      refreshToken: "refresh-token",
    });

    expect(result.access_token).toBe("new-access");
    expect(result.expires_in).toBe(3600);
  });

  it("リフレッシュ失敗時は例外になる", async () => {
    process.env.GOOGLE_CLIENT_ID = "client";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    resetEnvForTests();

    mockFetchOnce({
      ok: false,
      status: 400,
      body: { error: "invalid_grant" },
    });

    await expect(
      refreshGoogleAccessToken({ refreshToken: "refresh-token" })
    ).rejects.toThrow();
  });
});
