import { beforeEach, describe, expect, it } from "vitest";

import type { AuditLog } from "@/server/services/audit-logs";
import {
  buildAuditLogCsv,
  exportAuditLogsCsv,
  maskSensitiveMetadata,
} from "@/server/services/audit-log-export";
import { resetEnvForTests } from "@/server/utils/env";

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  resetEnvForTests();
});

describe("監査ログCSV生成", () => {
  const baseLog: AuditLog = {
    id: "log-1",
    action: "admin.user.invite",
    actorUserId: "user-1",
    actorEmail: "admin@example.com",
    organizationId: "org-1",
    organizationName: "テスト組織",
    targetType: "user",
    targetId: "user-1",
    createdAt: "2024-01-01T00:00:00.000Z",
    metadata: {
      token: "secret-token",
      note: "a,b",
    },
  };

  it("BOMとヘッダーが含まれる", () => {
    const csv = buildAuditLogCsv([baseLog]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("日時,操作,操作コード");
  });

  it("機密キーはマスクされる", () => {
    const csv = buildAuditLogCsv([baseLog]);
    expect(csv).not.toContain("secret-token");
    expect(csv).toContain("（マスク済み）");
  });

  it("カンマを含む値はクォートされる", () => {
    const csv = buildAuditLogCsv([baseLog]);
    const rows = csv.split("\n");
    const dataRow = rows[1] ?? "";
    expect(dataRow).toContain('"{""token"":""（マスク済み）""');
  });

  it("マスク関数は入れ子も対象にする", () => {
    const masked = maskSensitiveMetadata({
      token: "raw",
      nested: { refresh_token: "nested" },
      safe: "ok",
    });
    expect(masked.token).toBe("（マスク済み）");
    expect(masked.nested).toEqual({ refresh_token: "（マスク済み）" });
    expect(masked.safe).toBe("ok");
  });
});

describe("監査ログCSVエクスポート", () => {
  it("最大件数を超えるとエラーになる", async () => {
    const result = await exportAuditLogsCsv({ maxRows: 1, pageSize: 50 });
    expect(result.ok).toBe(false);
  });
});
