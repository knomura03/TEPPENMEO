import crypto from "crypto";

import { getEnv } from "@/server/utils/env";

const VERSION = "v1";
const IV_LENGTH = 12;

function decodeKey(rawKey: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  try {
    return Buffer.from(rawKey, "base64");
  } catch {
    return Buffer.from(rawKey, "utf8");
  }
}

function getKey(): Buffer {
  const rawKey = getEnv().TOKEN_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("TOKEN_ENCRYPTION_KEY が必要です");
  }
  const key = decodeKey(rawKey);
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY は32バイトである必要があります");
  }
  return key;
}

/**
 * AES-256-GCMで秘密情報を暗号化します。
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * encryptSecretで暗号化したデータを復号します。
 */
export function decryptSecret(payload: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split(":");
  if (version !== VERSION || !ivPart || !tagPart || !dataPart) {
    throw new Error("暗号化データが不正です");
  }

  const key = getKey();
  const iv = Buffer.from(ivPart, "base64");
  const tag = Buffer.from(tagPart, "base64");
  const ciphertext = Buffer.from(dataPart, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
