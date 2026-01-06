import { httpRequestJson } from "@/server/utils/http";
import { getEnv } from "@/server/utils/env";
import { isMockMode } from "@/server/utils/feature-flags";
import { ProviderError } from "@/server/providers/errors";
import {
  ProviderAdapter,
  ProviderAuthParams,
  ProviderCreatePostInput,
  ProviderOAuthResult,
  ProviderPost,
  ProviderRequestContext,
  ProviderType,
} from "@/server/providers/types";

const capabilities = {
  canConnectOAuth: true,
  canListLocations: false,
  canReadReviews: false,
  canReplyReviews: false,
  canCreatePosts: true,
  canReadInsights: false,
  canSearchPlaces: false,
};

function requireMetaEnv() {
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

async function getAuthUrl(params: ProviderAuthParams): Promise<string> {
  const env = requireMetaEnv();
  const redirectUri =
    params.redirectUri ??
    env.META_REDIRECT_URI ??
    `${env.APP_BASE_URL ?? ""}/api/providers/meta/callback`;

  const url = new URL("https://www.facebook.com/v20.0/dialog/oauth");
  url.searchParams.set("client_id", env.META_APP_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    [
      "pages_show_list",
      "pages_manage_posts",
      "pages_read_engagement",
      "instagram_basic",
      "instagram_content_publish",
    ].join(",")
  );
  url.searchParams.set("state", params.state);
  return url.toString();
}

async function handleOAuthCallback(params: {
  code: string;
  redirectUri?: string;
}): Promise<ProviderOAuthResult> {
  if (isMockMode()) {
    return {
      accessToken: "mock-meta-access",
      refreshToken: "mock-meta-refresh",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      scopes: ["pages_manage_posts"],
      externalAccountId: "mock-meta-user",
      displayName: "モックMetaユーザー",
    };
  }

  const env = requireMetaEnv();
  const redirectUri =
    params.redirectUri ??
    env.META_REDIRECT_URI ??
    `${env.APP_BASE_URL ?? ""}/api/providers/meta/callback`;

  const url = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
  url.searchParams.set("client_id", env.META_APP_ID ?? "");
  url.searchParams.set("client_secret", env.META_APP_SECRET ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", params.code);

  const response = await httpRequestJson<{
    access_token: string;
    expires_in?: number;
  }>(url.toString());

  return {
    accessToken: response.access_token,
    expiresAt: response.expires_in
      ? new Date(Date.now() + response.expires_in * 1000).toISOString()
      : undefined,
  };
}

async function createPost(
  _context: ProviderRequestContext,
  input: ProviderCreatePostInput
): Promise<ProviderPost> {
  void _context;
  if (isMockMode()) {
    return {
      id: "meta-post-1",
      content: input.content,
      mediaUrls: input.mediaUrls,
      status: "published",
    };
  }

  throw new ProviderError(
    ProviderType.Meta,
    "not_supported",
    "Metaの投稿公開は未実装です"
  );
}

export const metaProvider: ProviderAdapter = {
  type: ProviderType.Meta,
  displayName: "Meta（Facebook/Instagram）",
  capabilities,
  requiredEnv: ["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI"],
  getAuthUrl,
  handleOAuthCallback,
  createPost,
};
