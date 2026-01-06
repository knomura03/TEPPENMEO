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
  ProviderReview,
  ProviderType,
} from "@/server/providers/types";
import {
  exchangeCodeForToken,
  getGoogleEnv,
} from "@/server/providers/google_gbp/oauth";
import {
  listGoogleLocations,
  listGoogleReviews,
  replyGoogleReview,
} from "@/server/providers/google_gbp/api";

const capabilities = {
  canConnectOAuth: true,
  canListLocations: true,
  canReadReviews: true,
  canReplyReviews: true,
  canCreatePosts: true,
  canReadInsights: true,
  canSearchPlaces: false,
};

async function getAuthUrl(params: ProviderAuthParams): Promise<string> {
  const env = getGoogleEnv();
  const redirectUri =
    params.redirectUri ??
    env.GOOGLE_REDIRECT_URI ??
    `${env.APP_BASE_URL ?? ""}/api/providers/google/callback`;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    [
      "https://www.googleapis.com/auth/business.manage",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ")
  );
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", params.state);
  return url.toString();
}

async function handleOAuthCallback(params: {
  code: string;
  redirectUri?: string;
}): Promise<ProviderOAuthResult> {
  if (isMockMode()) {
    return {
      accessToken: "mock-google-access",
      refreshToken: "mock-google-refresh",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      scopes: ["business.manage"],
      externalAccountId: "mock-account",
      displayName: "モックGoogleアカウント",
    };
  }

  const env = getGoogleEnv();
  const redirectUri =
    params.redirectUri ??
    env.GOOGLE_REDIRECT_URI ??
    `${env.APP_BASE_URL ?? ""}/api/providers/google/callback`;

  const response = await exchangeCodeForToken({
    code: params.code,
    redirectUri,
  });

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: new Date(Date.now() + response.expires_in * 1000).toISOString(),
    scopes: response.scope?.split(" "),
  };
}

async function listLocations(
  _context: ProviderRequestContext
): Promise<ProviderLocation[]> {
  if (isMockMode()) {
    return [
      {
        id: "google-location-1",
        name: "TEPPEN 渋谷",
        address: "東京都渋谷区渋谷1-2-3",
        lat: 35.6595,
        lng: 139.7005,
      },
    ];
  }

  const accessToken = _context.account?.auth?.accessToken;
  if (!accessToken) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "auth_required",
      "Google接続が必要です"
    );
  }
  return listGoogleLocations(accessToken);
}

async function listReviews(
  _context: ProviderRequestContext
): Promise<ProviderReview[]> {
  if (isMockMode()) {
    return [
      {
        id: "review-1",
        rating: 4.5,
        author: "愛子",
        comment: "対応が早くて助かりました。",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const accessToken = _context.account?.auth?.accessToken;
  if (!accessToken) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "auth_required",
      "Google接続が必要です"
    );
  }
  if (!_context.locationId) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "validation_error",
      "GBPロケーションが未紐付けです"
    );
  }
  return listGoogleReviews(accessToken, _context.locationId);
}

async function replyReview(
  _context: ProviderRequestContext,
  _reviewId: string,
  _reply: string
): Promise<void> {
  if (isMockMode()) return;

  const accessToken = _context.account?.auth?.accessToken;
  if (!accessToken) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "auth_required",
      "Google接続が必要です"
    );
  }
  if (!_context.locationId) {
    throw new ProviderError(
      ProviderType.GoogleBusinessProfile,
      "validation_error",
      "GBPロケーションが未紐付けです"
    );
  }
  await replyGoogleReview(accessToken, _context.locationId, _reviewId, _reply);
}

async function createPost(
  _context: ProviderRequestContext,
  input: ProviderCreatePostInput
): Promise<ProviderPost> {
  void _context;
  if (isMockMode()) {
    return {
      id: "post-1",
      content: input.content,
      mediaUrls: input.mediaUrls,
      status: "published",
    };
  }

  throw new ProviderError(
    ProviderType.GoogleBusinessProfile,
    "not_supported",
    "GBPの投稿作成は未実装です"
  );
}

export const googleBusinessProfileProvider: ProviderAdapter = {
  type: ProviderType.GoogleBusinessProfile,
  displayName: "Google ビジネス プロフィール",
  capabilities,
  requiredEnv: [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
  ],
  getAuthUrl,
  handleOAuthCallback,
  listLocations,
  listReviews,
  replyReview,
  createPost,
};
