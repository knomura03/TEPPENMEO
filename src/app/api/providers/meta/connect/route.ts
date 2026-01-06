import { NextResponse } from "next/server";

import { metaProvider } from "@/server/providers/meta";
import { ProviderType } from "@/server/providers/types";
import { getSessionUser } from "@/server/auth/session";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { getLocationById } from "@/server/services/locations";
import { getMembershipRole } from "@/server/auth/rbac";
import { createOAuthState } from "@/server/utils/oauth-state";

function buildRedirectUri(requestUrl: string) {
  const url = new URL(requestUrl);
  return `${url.origin}/api/providers/meta/callback`;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  const url = new URL(request.url);
  const locationId = url.searchParams.get("locationId") ?? undefined;

  let organizationId: string | null = null;
  if (locationId) {
    const location = await getLocationById(locationId);
    if (!location) {
      return NextResponse.redirect(new URL("/app/locations", request.url));
    }
    const role = await getMembershipRole(user.id, location.organizationId);
    if (!role) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    organizationId = location.organizationId;
  } else {
    const org = await getPrimaryOrganization(user.id);
    organizationId = org?.id ?? null;
  }

  if (!organizationId) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const state = createOAuthState({
    provider: ProviderType.Meta,
    organizationId,
    locationId,
  });

  const redirectUri = buildRedirectUri(request.url);
  const authUrl = await metaProvider.getAuthUrl?.({
    state,
    redirectUri,
  });

  if (!authUrl) {
    return NextResponse.redirect(new URL("/app/locations", request.url));
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("oauth_state_meta", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}
