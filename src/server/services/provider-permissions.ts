import type { MetaPermissionStatus } from "@/server/providers/meta/oauth";

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeList(
  values: string[],
  normalize?: (value: string) => string
): string[] {
  const mapper = normalize ?? ((value: string) => value);
  return uniqueList(values.map((value) => mapper(value)).filter(Boolean));
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

export type PermissionDiffState = "ok" | "missing" | "requested" | "unknown";

export type PermissionDiff = {
  required: string[];
  requested: string[];
  granted: string[];
  missing: string[];
  state: PermissionDiffState;
};

export function resolvePermissionDiff(params: {
  required: string[];
  requested?: string[];
  granted?: string[];
  normalize?: (value: string) => string;
}): PermissionDiff {
  const required = normalizeList(params.required, params.normalize);
  const requested = normalizeList(params.requested ?? [], params.normalize);
  const granted = normalizeList(params.granted ?? [], params.normalize);

  if (granted.length > 0) {
    const missing = required.filter((item) => !granted.includes(item));
    return {
      required,
      requested,
      granted,
      missing,
      state: missing.length > 0 ? "missing" : "ok",
    };
  }

  if (requested.length > 0) {
    const missing = required.filter((item) => !requested.includes(item));
    return {
      required,
      requested,
      granted,
      missing,
      state: missing.length > 0 ? "missing" : "requested",
    };
  }

  return {
    required,
    requested,
    granted,
    missing: [],
    state: "unknown",
  };
}
