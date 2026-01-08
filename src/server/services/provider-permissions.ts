import type { MetaPermissionStatus } from "@/server/providers/meta/oauth";

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function buildGoogleScopeMetadata(requestedScopes: string[]) {
  return {
    requested_scopes: uniqueList(requestedScopes),
  };
}

export function buildMetaPermissionMetadata(params: {
  requestedPermissions: string[];
  status?: MetaPermissionStatus | null;
}) {
  const requested = uniqueList(params.requestedPermissions);
  const granted = params.status?.granted ?? [];
  const declined = params.status?.declined ?? [];
  const pending = params.status?.pending ?? [];

  return {
    requested_permissions: requested,
    permissions_granted: granted.length ? uniqueList(granted) : null,
    permissions_declined: declined.length ? uniqueList(declined) : null,
    permissions_pending: pending.length ? uniqueList(pending) : null,
  };
}
