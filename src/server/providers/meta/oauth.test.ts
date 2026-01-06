import { describe, expect, it } from "vitest";

import { HttpError } from "@/server/utils/http";
import { mapMetaCallbackError, mapMetaOAuthError } from "@/server/providers/meta/oauth";

describe("Meta OAuth エラー変換", () => {
  it("callbackのaccess_deniedは再接続案内になる", () => {
    const message = mapMetaCallbackError({ error: "access_denied" });
    expect(message).toContain("アクセスが拒否");
  });

  it("redirect_uri_mismatchは設定確認メッセージになる", () => {
    const error = new HttpError(
      400,
      JSON.stringify({ error: "redirect_uri_mismatch" })
    );
    const message = mapMetaOAuthError(error);
    expect(message).toContain("リダイレクトURI");
  });

  it("コード190はトークン無効メッセージになる", () => {
    const error = new HttpError(
      400,
      JSON.stringify({ error: { code: 190, message: "Invalid token" } })
    );
    const message = mapMetaOAuthError(error);
    expect(message).toContain("トークンが無効");
  });
});
