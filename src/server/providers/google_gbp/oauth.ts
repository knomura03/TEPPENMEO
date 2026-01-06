import { ProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import { getEnv } from "@/server/utils/env";
import { httpRequestJson, HttpError } from "@/server/utils/http";

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

export type GoogleUserInfo = {
  id: string;
  email?: string;
  name?: string;
};

const tokenEndpoint = "https://oauth2.googleapis.com/token";
const userInfoEndpoint = "https://www.googleapis.com/oauth2/v2/userinfo";
const accountEndpoint =
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";

export function getGoogleEnv() {
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "not_configured",
      "Google OAuthの認証情報が未設定です"
    );
  }
  return env;
}

export async function exchangeCodeForToken(params: {
  code: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const env = getGoogleEnv();
  const body = new URLSearchParams({
    code: params.code,
    client_id: env.GOOGLE_CLIENT_ID ?? "",
    client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });

  return httpRequestJson<GoogleTokenResponse>(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

export async function refreshGoogleAccessToken(params: {
  refreshToken: string;
}): Promise<GoogleTokenResponse> {
  const env = getGoogleEnv();
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? "",
    client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: params.refreshToken,
    grant_type: "refresh_token",
  });

  return httpRequestJson<GoogleTokenResponse>(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  return httpRequestJson<GoogleUserInfo>(userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function checkGoogleApiAccess(accessToken: string): Promise<{
  ok: boolean;
  message?: string;
}> {
  try {
    await httpRequestJson(accountEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        ok: false,
        message:
          "Google Business ProfileのAPI承認が必要です。承認後に再接続してください。",
      };
    }
    return {
      ok: false,
      message:
        "Google Business ProfileのAPI確認に失敗しました。しばらく後で再接続してください。",
    };
  }
}

export function mapGoogleOAuthError(error: unknown): string {
  if (error instanceof HttpError) {
    try {
      const body = JSON.parse(error.body) as {
        error?: string;
        error_description?: string;
      };
      const code = body.error ?? "";
      if (code === "invalid_grant") {
        return "認可コードが無効です。もう一度接続をやり直してください。";
      }
      if (code === "redirect_uri_mismatch") {
        return "リダイレクトURIが一致しません。Google Cloudの設定を確認してください。";
      }
      if (code === "invalid_client") {
        return "クライアントID/シークレットが無効です。環境変数を確認してください。";
      }
      if (body.error_description) {
        return `認証に失敗しました: ${body.error_description}。もう一度接続してください。`;
      }
    } catch {
      return "認証に失敗しました。もう一度接続してください。";
    }
  }
  return "認証に失敗しました。もう一度接続してください。";
}

export function mapGoogleCallbackError(params: {
  error: string;
  description?: string | null;
}): string {
  if (params.error === "access_denied") {
    return "Googleでアクセスが拒否されました。権限を許可して再接続してください。";
  }
  if (params.description) {
    return `認証に失敗しました: ${params.description}。もう一度接続してください。`;
  }
  return "認証に失敗しました。もう一度接続してください。";
}
