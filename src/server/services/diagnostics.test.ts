import { describe, expect, it } from "vitest";

import { resolveUserBlocksSchemaStatus } from "@/server/services/diagnostics";

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
