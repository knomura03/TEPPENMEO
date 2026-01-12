import { describe, expect, it } from "vitest";

import { maskSensitiveJson, maskSensitiveText } from "./redaction";

describe("maskSensitiveText", () => {
  it("null/undefined は なし を返す", () => {
    expect(maskSensitiveText(null)).toBe("なし");
    expect(maskSensitiveText(undefined)).toBe("なし");
  });

  it("機密っぽい文字列はマスクする", () => {
    expect(maskSensitiveText("access_token=abc")).toBe("***");
    expect(maskSensitiveText("client_secret")).toBe("***");
  });

  it("通常の文字列はそのまま返す", () => {
    expect(maskSensitiveText("monkey")).toBe("monkey");
    expect(maskSensitiveText("レビュー対応")).toBe("レビュー対応");
  });
});

describe("maskSensitiveJson", () => {
  it("機密キーの値をマスクする", () => {
    const output = maskSensitiveJson({
      access_token: "abc",
      nested: { apiKey: "xyz", ok: "safe" },
      items: [{ refreshToken: "zzz" }],
      ok: "keep",
    });

    expect(output.access_token).toBe("***");
    expect((output.nested as Record<string, unknown>).apiKey).toBe("***");
    expect((output.nested as Record<string, unknown>).ok).toBe("safe");
    expect((output.items as Array<Record<string, unknown>>)[0].refreshToken).toBe(
      "***"
    );
    expect(output.ok).toBe("keep");
  });
});
