import { beforeEach, describe, expect, it } from "vitest";

import {
  MediaError,
  createSignedImageUrlForPath,
  getMediaConfig,
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
});
