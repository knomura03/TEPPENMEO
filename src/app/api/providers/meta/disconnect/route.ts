import { NextResponse } from "next/server";

import { getActiveSessionUser } from "@/server/auth/session";
import { getMembershipRole } from "@/server/auth/rbac";
import { getLocationById } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { clearProviderAccount } from "@/server/services/provider-accounts";
import { writeAuditLog } from "@/server/services/audit-logs";
import { ProviderType } from "@/server/providers/types";

export async function POST(request: Request) {
  const user = await getActiveSessionUser();
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

  await clearProviderAccount(organizationId, ProviderType.Meta);
  await writeAuditLog({
    actorUserId: user.id,
    organizationId,
    action: "provider.disconnect",
    targetType: "provider",
    targetId: ProviderType.Meta,
  });

  if (locationId) {
    return NextResponse.redirect(new URL(`/app/locations/${locationId}`, request.url));
  }
  return NextResponse.redirect(new URL("/app/locations", request.url));
}
