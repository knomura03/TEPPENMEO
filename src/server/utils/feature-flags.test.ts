import { describe, expect, it } from "vitest";

import { isProviderMockMode } from "@/server/utils/feature-flags";
import { resetEnvForTests } from "@/server/utils/env";

describe("isProviderMockMode", () => {
  it("真の値を認識する", () => {
    process.env.PROVIDER_MOCK_MODE = "yes";
    resetEnvForTests();
    expect(isProviderMockMode()).toBe(true);
  });

  it("偽の値を認識する", () => {
    process.env.PROVIDER_MOCK_MODE = "0";
    resetEnvForTests();
    expect(isProviderMockMode()).toBe(false);
  });

  it("未設定はデフォルトtrue", () => {
    delete process.env.PROVIDER_MOCK_MODE;
    resetEnvForTests();
    expect(isProviderMockMode()).toBe(true);
  });
});
