import crypto from "crypto";

import { ProviderType } from "@/server/providers/types";
import { getEnv } from "@/server/utils/env";

const STATE_VERSION = "v1";
const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000;

export type OAuthStatePayload = {
  v: typeof STATE_VERSION;
  provider: ProviderType;
  organizationId: string;
  locationId?: string;
  createdAt: number;
  nonce: string;
};

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

function getStateKey(): Buffer {
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

function sign(payload: string): string {
  const hmac = crypto.createHmac("sha256", getStateKey());
  hmac.update(payload);
  return hmac.digest("base64url");
}

export function createOAuthState(input: {
  provider: ProviderType;
  organizationId: string;
  locationId?: string;
  createdAt?: number;
}): string {
  const payload: OAuthStatePayload = {
    v: STATE_VERSION,
    provider: input.provider,
    organizationId: input.organizationId,
    locationId: input.locationId,
    createdAt: input.createdAt ?? Date.now(),
    nonce: crypto.randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(
  state: string,
  maxAgeMs = DEFAULT_MAX_AGE_MS
): OAuthStatePayload {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) {
    throw new Error("認証状態が不正です。もう一度接続してください。");
  }
  const expected = sign(encoded);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("認証状態の検証に失敗しました。もう一度接続してください。");
  }
  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8")
  ) as OAuthStatePayload;

  if (payload.v !== STATE_VERSION) {
    throw new Error("認証状態が不正です。もう一度接続してください。");
  }
  if (Date.now() - payload.createdAt > maxAgeMs) {
    throw new Error("認証状態の有効期限が切れました。もう一度接続してください。");
  }
  return payload;
}
