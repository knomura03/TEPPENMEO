import { isMockMode } from "@/server/utils/feature-flags";
import { ProviderError } from "@/server/providers/errors";
import {
  ProviderAdapter,
  ProviderAuthParams,
  ProviderCreatePostInput,
  ProviderLocation,
  ProviderOAuthResult,
  ProviderPost,
  ProviderRequestContext,
  ProviderType,
} from "@/server/providers/types";
import { listMetaPages } from "@/server/providers/meta/api";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getMetaEnv,
} from "@/server/providers/meta/oauth";

const capabilities = {
  canConnectOAuth: true,
  canListLocations: true,
  canReadReviews: true,
  canReplyReviews: true,
  canCreatePosts: true,
  canReadInsights: false,
  canSearchPlaces: false,
};

const metaScopes = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_manage_engagement",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_comments",
  "instagram_content_publish",
];

async function getAuthUrl(params: ProviderAuthParams): Promise<string> {
  const env = getMetaEnv();
  const redirectUri =
    params.redirectUri ??
    env.META_REDIRECT_URI ??
    `${env.APP_BASE_URL ?? ""}/api/providers/meta/callback`;

  const url = new URL("https://www.facebook.com/v20.0/dialog/oauth");
  url.searchParams.set("client_id", env.META_APP_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", metaScopes.join(","));
  url.searchParams.set("state", params.state);
  url.searchParams.set("auth_type", "rerequest");
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

  const env = getMetaEnv();
  const redirectUri =
    params.redirectUri ??
    env.META_REDIRECT_URI ??
    `${env.APP_BASE_URL ?? ""}/api/providers/meta/callback`;

  const response = await exchangeCodeForToken({
    code: params.code,
    redirectUri,
  });

  let accessToken = response.access_token;
  let expiresIn = response.expires_in;

  try {
    const extended = await exchangeForLongLivedToken({ accessToken });
    accessToken = extended.access_token;
    expiresIn = extended.expires_in ?? expiresIn;
  } catch {
    // 長期化に失敗しても短期トークンで継続する
  }

  return {
    accessToken,
    expiresAt: expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : undefined,
  };
}

async function listLocations(
  context: ProviderRequestContext
): Promise<ProviderLocation[]> {
  if (isMockMode()) {
    return [
      {
        id: "meta-page-1",
        name: "TEPPEN 公式ページ",
      },
    ];
  }

  const accessToken = context.account?.auth?.accessToken;
  if (!accessToken) {
    throw new ProviderError(
      ProviderType.Meta,
      "auth_required",
      "Meta接続が必要です"
    );
  }

  const pages = await listMetaPages(accessToken);
  return pages.map((page) => ({
    id: page.id,
    name: page.name,
  }));
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
  listLocations,
  createPost,
};
