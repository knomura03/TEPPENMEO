import { describe, expect, it } from "vitest";

import {
  getEnvCheckGroups,
  resolveAuditLogsIndexStatus,
  resolveSetupProgressSchemaStatus,
  resolveUserBlocksSchemaStatus,
} from "@/server/services/diagnostics";
import { resetEnvForTests } from "@/server/utils/env";

describe("user_blocks マイグレーション判定", () => {
  it("エラーなしなら適用済み", () => {
    const result = resolveUserBlocksSchemaStatus(null);
    expect(result.status).toBe("ok");
    expect(result.issue).toBeNull();
  });

  it("テーブル未作成を検知する", () => {
    const result = resolveUserBlocksSchemaStatus({
      code: "42P01",
      message: "relation \"user_blocks\" does not exist",
    });
    expect(result.status).toBe("missing");
    expect(result.issue).toBe("table_missing");
  });

  it("カラム未作成を検知する", () => {
    const result = resolveUserBlocksSchemaStatus({
      code: "42703",
      message: "column \"reason\" does not exist",
    });
    expect(result.status).toBe("missing");
    expect(result.issue).toBe("reason_missing");
  });

  it("未知のエラーは未判定として扱う", () => {
    const result = resolveUserBlocksSchemaStatus({
      code: "XX000",
      message: "unexpected",
    });
    expect(result.status).toBe("unknown");
    expect(result.issue).toBe("unknown");
  });
});

describe("setup_progress マイグレーション判定", () => {
  it("エラーなしなら適用済み", () => {
    const result = resolveSetupProgressSchemaStatus(null);
    expect(result.status).toBe("ok");
    expect(result.issue).toBeNull();
  });

  it("テーブル未作成を検知する", () => {
    const result = resolveSetupProgressSchemaStatus({
      code: "42P01",
      message: "relation \"setup_progress\" does not exist",
    });
    expect(result.status).toBe("missing");
    expect(result.issue).toBe("table_missing");
  });

  it("未知のエラーは未判定として扱う", () => {
    const result = resolveSetupProgressSchemaStatus({
      code: "XX000",
      message: "unexpected",
    });
    expect(result.status).toBe("unknown");
    expect(result.issue).toBe("unknown");
  });
});

describe("監査ログインデックス判定", () => {
  it("全てtrueなら適用済み", () => {
    const result = resolveAuditLogsIndexStatus(
      {
        audit_logs_created_at_idx: true,
        audit_logs_action_created_at_idx: true,
        audit_logs_org_created_at_idx: true,
        audit_logs_actor_created_at_idx: true,
      },
      null
    );
    expect(result.status).toBe("ok");
    expect(result.missingIndexes.length).toBe(0);
  });

  it("関数未作成は未適用として扱う", () => {
    const result = resolveAuditLogsIndexStatus(null, {
      code: "PGRST202",
      message: "Could not find the function audit_logs_indexes_status",
    });
    expect(result.status).toBe("missing");
  });

  it("一部不足は未適用として扱う", () => {
    const result = resolveAuditLogsIndexStatus(
      {
        audit_logs_created_at_idx: true,
        audit_logs_action_created_at_idx: false,
        audit_logs_org_created_at_idx: true,
        audit_logs_actor_created_at_idx: false,
      },
      null
    );
    expect(result.status).toBe("missing");
    expect(result.missingIndexes.length).toBeGreaterThan(0);
  });

  it("未知のエラーは未判定として扱う", () => {
    const result = resolveAuditLogsIndexStatus(null, {
      code: "XX000",
      message: "unexpected",
    });
    expect(result.status).toBe("unknown");
  });
});

describe("環境変数の分類", () => {
  it("モック必須と実機必須を分けて判定できる", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.TOKEN_ENCRYPTION_KEY = "key";
    process.env.APP_BASE_URL = "http://localhost:3000";
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.META_APP_ID;
    resetEnvForTests();

    const result = getEnvCheckGroups();
    expect(result.mockRequired.every((check) => check.present)).toBe(true);
    expect(result.realRequired.some((check) => !check.present)).toBe(true);
  });
});
