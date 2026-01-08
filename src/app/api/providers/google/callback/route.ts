import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ProviderType } from "@/server/providers/types";
import { getActiveSessionUser } from "@/server/auth/session";
import { getMembershipRole } from "@/server/auth/rbac";
import { encryptSecret } from "@/server/utils/crypto";
import { verifyOAuthState } from "@/server/utils/oauth-state";
import {
  checkGoogleApiAccess,
  exchangeCodeForToken,
  fetchGoogleUserInfo,
  getGoogleEnv,
  mapGoogleCallbackError,
  mapGoogleOAuthError,
} from "@/server/providers/google_gbp/oauth";
import {
  getProviderAccount,
  markProviderError,
  upsertProviderAccount,
} from "@/server/services/provider-accounts";
import { buildGoogleScopeMetadata } from "@/server/services/provider-permissions";
import { writeAuditLog } from "@/server/services/audit-logs";

const requestedGoogleScopes = [
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/userinfo.profile",
];

function buildRedirectUri(requestUrl: string) {
  const url = new URL(requestUrl);
  const env = getGoogleEnv();
  return (
    env.GOOGLE_REDIRECT_URI ??
    `${env.APP_BASE_URL ?? url.origin}/api/providers/google/callback`
  );
}

function buildRedirectTarget(requestUrl: string, locationId?: string) {
  const url = new URL(requestUrl);
  if (locationId) {
    return new URL(`/app/locations/${locationId}`, url.origin);
  }
  return new URL("/app/locations", url.origin);
}

function redirectWithStateClear(target: URL) {
  const response = NextResponse.redirect(target);
  response.cookies.delete("oauth_state_google");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("oauth_state_google")?.value;
  let payload;
  if (state) {
    try {
      payload = verifyOAuthState(state);
    } catch {
      payload = null;
    }
  }

  if (!state || !cookieState || state !== cookieState || !payload) {
    if (payload) {
      const message =
        "認証状態の検証に失敗しました。もう一度接続してください。";
      await markProviderError(
        payload.organizationId,
        ProviderType.GoogleBusinessProfile,
        message
      );
      await writeAuditLog({
        organizationId: payload.organizationId,
        action: "provider.connect_failed",
        targetType: "provider",
        targetId: ProviderType.GoogleBusinessProfile,
        metadata: { reason: "state_invalid" },
      });
    }

    return redirectWithStateClear(buildRedirectTarget(request.url));
  }

  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  const role = await getMembershipRole(user.id, payload.organizationId);
  if (!role) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const redirectTarget = buildRedirectTarget(request.url, payload.locationId);

  if (error) {
    const message = mapGoogleCallbackError({
      error,
      description: errorDescription,
    });
    await markProviderError(
      payload.organizationId,
      ProviderType.GoogleBusinessProfile,
      message
    );
    await writeAuditLog({
      actorUserId: user.id,
      organizationId: payload.organizationId,
      action: "provider.connect_failed",
      targetType: "provider",
      targetId: ProviderType.GoogleBusinessProfile,
      metadata: { reason: error },
    });

    return redirectWithStateClear(redirectTarget);
  }

  if (!code) {
    const message = "認可コードが取得できませんでした。もう一度接続してください。";
    await markProviderError(
      payload.organizationId,
      ProviderType.GoogleBusinessProfile,
      message
    );
    await writeAuditLog({
      actorUserId: user.id,
      organizationId: payload.organizationId,
      action: "provider.connect_failed",
      targetType: "provider",
      targetId: ProviderType.GoogleBusinessProfile,
      metadata: { reason: "code_missing" },
    });
    return redirectWithStateClear(redirectTarget);
  }

  try {
    const redirectUri = buildRedirectUri(request.url);
    const tokens = await exchangeCodeForToken({ code, redirectUri });
    const userInfo = await fetchGoogleUserInfo(tokens.access_token);

    const apiAccess = await checkGoogleApiAccess(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const existing = await getProviderAccount(
      payload.organizationId,
      ProviderType.GoogleBusinessProfile
    );

    const refreshTokenEncrypted = tokens.refresh_token
      ? encryptSecret(tokens.refresh_token)
      : existing?.refreshTokenEncrypted ?? null;

    await upsertProviderAccount(payload.organizationId, ProviderType.GoogleBusinessProfile, {
      externalAccountId: userInfo.id,
      displayName: userInfo.name ?? userInfo.email ?? "Googleアカウント",
      tokenEncrypted: encryptSecret(tokens.access_token),
      refreshTokenEncrypted,
      scopes: tokens.scope?.split(" ") ?? existing?.scopes ?? [],
      expiresAt,
      metadata: {
        account_email: userInfo.email ?? null,
        account_name: userInfo.name ?? null,
        api_access: apiAccess.ok,
        reauth_required: false,
        last_error: apiAccess.ok ? null : apiAccess.message,
        connected_at: new Date().toISOString(),
        ...buildGoogleScopeMetadata(requestedGoogleScopes),
      },
    });

    await writeAuditLog({
      actorUserId: user.id,
      organizationId: payload.organizationId,
      action: "provider.connect",
      targetType: "provider",
      targetId: ProviderType.GoogleBusinessProfile,
      metadata: { api_access: apiAccess.ok },
    });
  } catch (error) {
    const message = mapGoogleOAuthError(error);
    await markProviderError(
      payload.organizationId,
      ProviderType.GoogleBusinessProfile,
      message
    );
    await writeAuditLog({
      actorUserId: user.id,
      organizationId: payload.organizationId,
      action: "provider.connect_failed",
      targetType: "provider",
      targetId: ProviderType.GoogleBusinessProfile,
      metadata: { reason: "token_exchange_failed" },
    });
  }

  return redirectWithStateClear(redirectTarget);
}
