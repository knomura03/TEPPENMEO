import { ProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import { getEnv } from "@/server/utils/env";
import { HttpError, httpRequestJson } from "@/server/utils/http";

export type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type MetaUserInfo = {
  id: string;
  name?: string;
};

export type MetaTokenInfo = {
  scopes?: string[];
  expiresAt?: string;
  isValid?: boolean;
  userId?: string;
};

type MetaDebugResponse = {
  data?: {
    app_id?: string;
    type?: string;
    application?: string;
    expires_at?: number;
    is_valid?: boolean;
    scopes?: string[];
    user_id?: string;
  };
};

const tokenEndpoint = "https://graph.facebook.com/v20.0/oauth/access_token";
const debugEndpoint = "https://graph.facebook.com/debug_token";
const meEndpoint = "https://graph.facebook.com/v20.0/me";

export function getMetaEnv() {
  const env = getEnv();
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    throw new ProviderError(
      ProviderType.Meta,
      "not_configured",
      "Metaアプリの認証情報が未設定です"
    );
  }
  return env;
}

export async function exchangeCodeForToken(params: {
  code: string;
  redirectUri: string;
}): Promise<MetaTokenResponse> {
  const env = getMetaEnv();
  const url = new URL(tokenEndpoint);
  url.searchParams.set("client_id", env.META_APP_ID ?? "");
  url.searchParams.set("client_secret", env.META_APP_SECRET ?? "");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code", params.code);

  return httpRequestJson<MetaTokenResponse>(url.toString());
}

export async function exchangeForLongLivedToken(params: {
  accessToken: string;
}): Promise<MetaTokenResponse> {
  const env = getMetaEnv();
  const url = new URL(tokenEndpoint);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", env.META_APP_ID ?? "");
  url.searchParams.set("client_secret", env.META_APP_SECRET ?? "");
  url.searchParams.set("fb_exchange_token", params.accessToken);

  return httpRequestJson<MetaTokenResponse>(url.toString());
}

export async function fetchMetaUserInfo(
  accessToken: string
): Promise<MetaUserInfo> {
  const url = new URL(meEndpoint);
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", accessToken);
  return httpRequestJson<MetaUserInfo>(url.toString());
}

export async function fetchMetaTokenInfo(
  accessToken: string
): Promise<MetaTokenInfo> {
  const env = getMetaEnv();
  const url = new URL(debugEndpoint);
  url.searchParams.set("input_token", accessToken);
  url.searchParams.set(
    "access_token",
    `${env.META_APP_ID ?? ""}|${env.META_APP_SECRET ?? ""}`
  );

  try {
    const response = await httpRequestJson<MetaDebugResponse>(url.toString());
    const data = response.data ?? {};
    const expiresAt = data.expires_at
      ? new Date(data.expires_at * 1000).toISOString()
      : undefined;
    return {
      scopes: data.scopes,
      expiresAt,
      isValid: data.is_valid,
      userId: data.user_id,
    };
  } catch {
    return {};
  }
}

function parseOAuthErrorBody(body: string): {
  errorType?: string;
  errorDescription?: string;
  metaCode?: number;
  metaMessage?: string;
} {
  try {
    const payload = JSON.parse(body) as Record<string, unknown>;
    const errorValue = payload.error;
    if (typeof errorValue === "string") {
      return {
        errorType: errorValue,
        errorDescription: payload.error_description as string | undefined,
      };
    }
    if (errorValue && typeof errorValue === "object") {
      const metaError = errorValue as { code?: number; message?: string };
      return {
        metaCode: metaError.code,
        metaMessage: metaError.message,
      };
    }
  } catch {
    return {};
  }
  return {};
}

export function mapMetaOAuthError(error: unknown): string {
  if (error instanceof HttpError) {
    const parsed = parseOAuthErrorBody(error.body);
    if (parsed.errorType === "redirect_uri_mismatch") {
      return "リダイレクトURIが一致しません。Metaアプリの設定を確認してください。";
    }
    if (parsed.errorType === "invalid_grant") {
      return "認可コードが無効です。もう一度接続をやり直してください。";
    }
    if (parsed.metaCode === 190) {
      return "トークンが無効です。再認可してください。";
    }
    if (parsed.metaCode === 102) {
      return "アプリIDが無効です。環境変数を確認してください。";
    }
    if (parsed.metaMessage) {
      return "認証に失敗しました。Metaの設定を確認してください。";
    }
  }
  return "認証に失敗しました。もう一度接続してください。";
}

export function mapMetaCallbackError(params: {
  error: string;
  description?: string | null;
}): string {
  if (params.error === "access_denied") {
    return "Metaでアクセスが拒否されました。権限を許可して再接続してください。";
  }
  return "認証に失敗しました。もう一度接続してください。";
}
