import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ProviderType } from "@/server/providers/types";
import { getActiveSessionUser } from "@/server/auth/session";
import { getMembershipRole } from "@/server/auth/rbac";
import { encryptSecret } from "@/server/utils/crypto";
import { verifyOAuthState } from "@/server/utils/oauth-state";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchMetaPermissions,
  fetchMetaTokenInfo,
  fetchMetaUserInfo,
  getMetaEnv,
  mapMetaCallbackError,
  mapMetaOAuthError,
} from "@/server/providers/meta/oauth";
import {
  getProviderAccount,
  markProviderError,
  upsertProviderAccount,
} from "@/server/services/provider-accounts";
import { buildMetaPermissionMetadata } from "@/server/services/provider-permissions";
import { writeAuditLog } from "@/server/services/audit-logs";

const requestedMetaPermissions = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
];

function buildRedirectUri(requestUrl: string) {
  const url = new URL(requestUrl);
  const env = getMetaEnv();
  return (
    env.META_REDIRECT_URI ??
    `${env.APP_BASE_URL ?? url.origin}/api/providers/meta/callback`
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
  response.cookies.delete("oauth_state_meta");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("oauth_state_meta")?.value;
  let payload;
  if (state) {
    try {
      payload = verifyOAuthState(state);
    } catch {
      payload = null;
    }
  }

  if (
    !state ||
    !cookieState ||
    state !== cookieState ||
    !payload ||
    payload.provider !== ProviderType.Meta
  ) {
    if (payload?.organizationId) {
      const message =
        "認証状態の検証に失敗しました。もう一度接続してください。";
      await markProviderError(payload.organizationId, ProviderType.Meta, message);
      await writeAuditLog({
        organizationId: payload.organizationId,
        action: "provider.connect_failed",
        targetType: "provider",
        targetId: ProviderType.Meta,
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
    const message = mapMetaCallbackError({
      error,
      description: errorDescription,
    });
    await markProviderError(payload.organizationId, ProviderType.Meta, message);
    await writeAuditLog({
      actorUserId: user.id,
      organizationId: payload.organizationId,
      action: "provider.connect_failed",
      targetType: "provider",
      targetId: ProviderType.Meta,
      metadata: { reason: error },
    });

    return redirectWithStateClear(redirectTarget);
  }

  if (!code) {
    const message = "認可コードが取得できませんでした。もう一度接続してください。";
    await markProviderError(payload.organizationId, ProviderType.Meta, message);
    await writeAuditLog({
      actorUserId: user.id,
      organizationId: payload.organizationId,
      action: "provider.connect_failed",
      targetType: "provider",
      targetId: ProviderType.Meta,
      metadata: { reason: "code_missing" },
    });
    return redirectWithStateClear(redirectTarget);
  }

  try {
    const redirectUri = buildRedirectUri(request.url);
    const shortLived = await exchangeCodeForToken({ code, redirectUri });

    let accessToken = shortLived.access_token;
    let expiresIn = shortLived.expires_in;
    let longLived = false;

    try {
      const extended = await exchangeForLongLivedToken({ accessToken });
      accessToken = extended.access_token;
      expiresIn = extended.expires_in ?? expiresIn;
      longLived = true;
    } catch {
      longLived = false;
    }

    const userInfo = await fetchMetaUserInfo(accessToken);
    const tokenInfo = await fetchMetaTokenInfo(accessToken);
    const permissionStatus = await fetchMetaPermissions(accessToken);

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : tokenInfo.expiresAt;

    const existing = await getProviderAccount(payload.organizationId, ProviderType.Meta);

    await upsertProviderAccount(payload.organizationId, ProviderType.Meta, {
      externalAccountId: userInfo.id,
      displayName: userInfo.name ?? "Metaアカウント",
      tokenEncrypted: encryptSecret(accessToken),
      refreshTokenEncrypted: existing?.refreshTokenEncrypted ?? null,
      scopes: tokenInfo.scopes ?? existing?.scopes ?? [],
      expiresAt: expiresAt ?? existing?.expiresAt ?? null,
      metadata: {
        account_name: userInfo.name ?? null,
        reauth_required: false,
        last_error: null,
        connected_at: new Date().toISOString(),
        long_lived: longLived,
        ...buildMetaPermissionMetadata({
          requestedPermissions: requestedMetaPermissions,
          status: permissionStatus,
        }),
      },
    });

    await writeAuditLog({
      actorUserId: user.id,
      organizationId: payload.organizationId,
      action: "provider.connect",
      targetType: "provider",
      targetId: ProviderType.Meta,
      metadata: { long_lived: longLived },
    });
  } catch (error) {
    const message = mapMetaOAuthError(error);
    await markProviderError(payload.organizationId, ProviderType.Meta, message);
    await writeAuditLog({
      actorUserId: user.id,
      organizationId: payload.organizationId,
      action: "provider.connect_failed",
      targetType: "provider",
      targetId: ProviderType.Meta,
      metadata: { reason: "token_exchange_failed" },
    });
  }

  return redirectWithStateClear(redirectTarget);
}
