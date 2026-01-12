import { describe, expect, it } from "vitest";

import { formatSeedEnvErrors } from "./seed-env";

describe("formatSeedEnvErrors", () => {
  it("不足と形式不正を日本語で案内する", () => {
    const output = formatSeedEnvErrors({
      NEXT_PUBLIC_SUPABASE_URL: "missing",
      SYSTEM_ADMIN_EMAIL: "invalid",
      UNKNOWN_KEY: "missing",
    });

    expect(output).toContain("NEXT_PUBLIC_SUPABASE_URL（未設定）");
    expect(output).toContain("SYSTEM_ADMIN_EMAIL（形式不正）");
    expect(output).toContain("UNKNOWN_KEY（未設定）取得場所: 不明");
    expect(output).toContain("次にやること:");
  });
});
