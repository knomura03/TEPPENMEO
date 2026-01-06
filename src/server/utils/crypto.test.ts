import crypto from "crypto";
import { describe, expect, it, beforeEach } from "vitest";

import { decryptSecret, encryptSecret } from "@/server/utils/crypto";
import { resetEnvForTests } from "@/server/utils/env";

const key = crypto.randomBytes(32).toString("base64");

beforeEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = key;
  resetEnvForTests();
});

describe("encryptSecret/decryptSecret", () => {
  it("暗号化→復号が一致する", () => {
    const payload = encryptSecret("hello");
    expect(decryptSecret(payload)).toBe("hello");
  });

  it("キーが違うと失敗する", () => {
    const payload = encryptSecret("hello");
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
    resetEnvForTests();
    expect(() => decryptSecret(payload)).toThrow();
  });

  it("改ざんされたデータは失敗する", () => {
    const payload = encryptSecret("hello");
    const parts = payload.split(":");
    parts[3] = crypto.randomBytes(12).toString("base64");
    const tampered = parts.join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
