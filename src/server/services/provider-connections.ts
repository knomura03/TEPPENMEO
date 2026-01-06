import { ProviderType } from "@/server/providers/types";
import { providers } from "@/server/providers/registry";
import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { decryptSecret, encryptSecret } from "@/server/utils/crypto";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockProviderConnections } from "@/server/services/mock-data";
import {
  getProviderAccount,
  markProviderError,
  upsertProviderAccount,
} from "@/server/services/provider-accounts";
import { writeAuditLog } from "@/server/services/audit-logs";
import { refreshGoogleAccessToken } from "@/server/providers/google_gbp/oauth";

export type ProviderConnectionStatus =
  | "connected"
  | "not_connected"
  | "reauth_required";

export type ProviderConnection = {
  provider: ProviderType;
  status: ProviderConnectionStatus;
  message?: string;
};

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

function mapMockConnections(): ProviderConnection[] {
  return Object.entries(mockProviderConnections).map(([provider, connected]) => ({
    provider: provider as ProviderType,
    status: connected ? "connected" : "not_connected",
  }));
}

async function maybeRefreshGoogleAccount(
  organizationId: string,
  actorUserId?: string | null
) {
  const account = await getProviderAccount(
    organizationId,
    ProviderType.GoogleBusinessProfile
  );

  if (!account) return account;
  const metadata = account.metadata ?? {};
  if (metadata.reauth_required) return account;

  if (!account.expiresAt) return account;
  const expiresAt = new Date(account.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) return account;

  const shouldRefresh = expiresAt - Date.now() <= REFRESH_THRESHOLD_MS;
  if (!shouldRefresh) return account;

  if (!account.refreshTokenEncrypted) {
    const message =
      "認証の有効期限が近づいています。Googleで再接続してください。";
    await markProviderError(
      organizationId,
      ProviderType.GoogleBusinessProfile,
      message,
      true
    );
    await writeAuditLog({
      actorUserId: actorUserId ?? null,
      organizationId,
      action: "provider.reauth_required",
      targetType: "provider",
      targetId: ProviderType.GoogleBusinessProfile,
      metadata: { reason: "refresh_token_missing" },
    });
    return {
      ...account,
      metadata: { ...metadata, reauth_required: true, last_error: message },
    };
  }

  try {
    const refreshToken = decryptSecret(account.refreshTokenEncrypted);
    const refreshed = await refreshGoogleAccessToken({ refreshToken });
    const updated = await upsertProviderAccount(
      organizationId,
      ProviderType.GoogleBusinessProfile,
      {
        tokenEncrypted: encryptSecret(refreshed.access_token),
        refreshTokenEncrypted: refreshed.refresh_token
          ? encryptSecret(refreshed.refresh_token)
          : account.refreshTokenEncrypted,
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        scopes: refreshed.scope?.split(" ") ?? account.scopes,
        metadata: {
          reauth_required: false,
          last_error: null,
        },
      }
    );
    return updated ?? account;
  } catch {
    const message =
      "認証の更新に失敗しました。Googleで再接続してください。";
    await markProviderError(
      organizationId,
      ProviderType.GoogleBusinessProfile,
      message,
      true
    );
    await writeAuditLog({
      actorUserId: actorUserId ?? null,
      organizationId,
      action: "provider.reauth_required",
      targetType: "provider",
      targetId: ProviderType.GoogleBusinessProfile,
      metadata: { reason: "refresh_failed" },
    });
    return {
      ...account,
      metadata: { ...metadata, reauth_required: true, last_error: message },
    };
  }
}

export async function listProviderConnections(
  organizationId: string,
  actorUserId?: string | null
): Promise<ProviderConnection[]> {
  if (!isSupabaseConfigured()) {
    return mapMockConnections();
  }

  const admin = getSupabaseAdmin();
  if (!admin) return mapMockConnections();

  await maybeRefreshGoogleAccount(organizationId, actorUserId);

  const { data } = await admin
    .from("provider_accounts")
    .select("provider, token_encrypted, metadata_json")
    .eq("organization_id", organizationId);

  const accountMap = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    accountMap.set(row.provider as string, row as Record<string, unknown>);
  }

  return providers.map((provider) => {
    const row = accountMap.get(provider.type);
    if (!row || !row.token_encrypted) {
      return {
        provider: provider.type,
        status: "not_connected",
        message: (row?.metadata_json as Record<string, unknown>)?.last_error as
          | string
          | undefined,
      };
    }

    const metadata = (row.metadata_json as Record<string, unknown>) ?? {};
    if (metadata.reauth_required) {
      return {
        provider: provider.type,
        status: "reauth_required",
        message: metadata.last_error as string | undefined,
      };
    }

    return {
      provider: provider.type,
      status: "connected",
      message: metadata.last_error as string | undefined,
    };
  });
}
