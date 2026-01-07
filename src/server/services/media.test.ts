import { beforeEach, describe, expect, it } from "vitest";

import {
  MediaError,
  createSignedImageUrlForPath,
  getMediaConfig,
  isLocationMediaPath,
  isStorageConfigured,
  normalizeMediaEntries,
  validateImageFile,
} from "@/server/services/media";
import { resetEnvForTests } from "@/server/utils/env";

beforeEach(() => {
  delete process.env.SUPABASE_STORAGE_BUCKET;
  delete process.env.MEDIA_SIGNED_URL_TTL_SECONDS;
  delete process.env.MAX_UPLOAD_MB;
  resetEnvForTests();
});

describe("画像アップロードのバリデーション", () => {
  it("許可された画像形式は通る", () => {
    const file = new File([new Uint8Array([1])], "test.png", {
      type: "image/png",
    });
    expect(() => validateImageFile(file, 1024)).not.toThrow();
  });

  it("画像以外はエラーになる", () => {
    const file = new File([new Uint8Array([1])], "test.txt", {
      type: "text/plain",
    });
    expect(() => validateImageFile(file, 1024)).toThrow(MediaError);
  });

  it("サイズ超過はエラーになる", () => {
    const file = new File([new Uint8Array([1, 2])], "test.png", {
      type: "image/png",
    });
    expect(() => validateImageFile(file, 1)).toThrow(MediaError);
  });
});

describe("署名URLの設定", () => {
  it("TTLを環境変数から読み取る", () => {
    process.env.MEDIA_SIGNED_URL_TTL_SECONDS = "1800";
    resetEnvForTests();
    const config = getMediaConfig();
    expect(config.signedUrlTtlSeconds).toBe(1800);
  });

  it("バケット未設定なら署名URL発行は失敗する", async () => {
    await expect(createSignedImageUrlForPath("org/test.png")).rejects.toThrow(
      MediaError
    );
  });

  it("サービスキー未設定ならStorage利用不可", () => {
    process.env.SUPABASE_STORAGE_BUCKET = "bucket";
    resetEnvForTests();
    expect(isStorageConfigured()).toBe(false);
  });
});

describe("メディア正規化", () => {
  it("URLとstorage参照を正規化する", () => {
    const result = normalizeMediaEntries([
      "https://example.com/test.png",
      "storage://bucket/org/loc/file.png",
    ]);
    expect(result.length).toBe(2);
    expect(result[0].source).toBe("url");
    expect(result[1].source).toBe("storage");
  });

  it("不正な入力は除外する", () => {
    const result = normalizeMediaEntries(["invalid://test", 123]);
    expect(result.length).toBe(0);
  });
});

describe("パス権限チェック", () => {
  it("org/loc のパスなら許可される", () => {
    expect(
      isLocationMediaPath("org/org-1/loc/loc-1/file.png", "org-1", "loc-1")
    ).toBe(true);
  });

  it("別のロケーションは拒否される", () => {
    expect(
      isLocationMediaPath("org/org-1/loc/loc-2/file.png", "org-1", "loc-1")
    ).toBe(false);
  });
});
