import crypto from "crypto";
import { describe, expect, it, beforeEach } from "vitest";

import { ProviderType } from "@/server/providers/types";
import { createOAuthState, verifyOAuthState } from "@/server/utils/oauth-state";
import { resetEnvForTests } from "@/server/utils/env";

const key = crypto.randomBytes(32).toString("base64");

beforeEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = key;
  resetEnvForTests();
});

describe("OAuth state", () => {
  it("作成と検証が一致する", () => {
    const state = createOAuthState({
      provider: ProviderType.GoogleBusinessProfile,
      organizationId: "org-1",
      locationId: "loc-1",
    });

    const payload = verifyOAuthState(state);
    expect(payload.provider).toBe(ProviderType.GoogleBusinessProfile);
    expect(payload.organizationId).toBe("org-1");
    expect(payload.locationId).toBe("loc-1");
  });

  it("改ざんされたstateは失敗する", () => {
    const state = createOAuthState({
      provider: ProviderType.GoogleBusinessProfile,
      organizationId: "org-1",
    });
    const [encoded] = state.split(".");
    const tampered = `${encoded}.invalid`;
    expect(() => verifyOAuthState(tampered)).toThrow();
  });

  it("期限切れのstateは失敗する", () => {
    const state = createOAuthState({
      provider: ProviderType.GoogleBusinessProfile,
      organizationId: "org-1",
      createdAt: Date.now() - 11 * 60 * 1000,
    });
    expect(() => verifyOAuthState(state)).toThrow();
  });
});
