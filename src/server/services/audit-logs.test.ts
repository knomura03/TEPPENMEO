import { beforeEach, describe, expect, it } from "vitest";

import { ProviderType } from "@/server/providers/types";
import { queryAuditLogs } from "@/server/services/audit-logs";
import { resetEnvForTests } from "@/server/utils/env";

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  resetEnvForTests();
});

describe("監査ログ検索（モック）", () => {
  it("アクションで絞り込める", async () => {
    const result = await queryAuditLogs({
      filters: { action: "provider.connect" },
    });
    expect(result.logs.length).toBeGreaterThan(0);
    expect(result.logs.every((log) => log.action === "provider.connect")).toBe(
      true
    );
  });

  it("プロバイダで絞り込める", async () => {
    const result = await queryAuditLogs({
      filters: { providerType: ProviderType.GoogleBusinessProfile },
    });
    expect(result.logs.length).toBeGreaterThan(0);
    expect(
      result.logs.every(
        (log) => {
          const provider = log.metadata.provider as string | undefined;
          return (
            log.targetId === ProviderType.GoogleBusinessProfile ||
            provider === ProviderType.GoogleBusinessProfile
          );
        }
      )
    ).toBe(true);
  });

  it("自由検索で絞り込める", async () => {
    const result = await queryAuditLogs({
      filters: { text: "API承認" },
    });
    expect(result.logs.length).toBeGreaterThan(0);
  });
});
