import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { ProviderType } from "@/server/providers/types";
import { isSupabaseConfigured } from "@/server/utils/env";

export type ProviderAccountRecord = {
  id: string;
  organizationId: string;
  provider: ProviderType;
  externalAccountId?: string | null;
  displayName?: string | null;
  tokenEncrypted?: string | null;
  refreshTokenEncrypted?: string | null;
  scopes: string[];
  expiresAt?: string | null;
  metadata: Record<string, unknown>;
};

function mapProviderAccount(row: Record<string, unknown>): ProviderAccountRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    provider: row.provider as ProviderType,
    externalAccountId: row.external_account_id as string | null,
    displayName: row.display_name as string | null,
    tokenEncrypted: row.token_encrypted as string | null,
    refreshTokenEncrypted: row.refresh_token_encrypted as string | null,
    scopes: (row.scopes as string[] | null) ?? [],
    expiresAt: row.expires_at as string | null,
    metadata: (row.metadata_json as Record<string, unknown>) ?? {},
  };
}

export async function getProviderAccount(
  organizationId: string,
  provider: ProviderType
): Promise<ProviderAccountRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("provider_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();

  if (error || !data) return null;
  return mapProviderAccount(data as Record<string, unknown>);
}

export async function upsertProviderAccount(
  organizationId: string,
  provider: ProviderType,
  input: {
    externalAccountId?: string | null;
    displayName?: string | null;
    tokenEncrypted?: string | null;
    refreshTokenEncrypted?: string | null;
    scopes?: string[];
    expiresAt?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<ProviderAccountRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const existing = await getProviderAccount(organizationId, provider);
  const mergedMetadata = {
    ...(existing?.metadata ?? {}),
    ...(input.metadata ?? {}),
  };
  const refreshTokenEncrypted =
    input.refreshTokenEncrypted ?? existing?.refreshTokenEncrypted ?? null;

  if (existing) {
    const { data, error } = await admin
      .from("provider_accounts")
      .update({
        external_account_id: input.externalAccountId ?? existing.externalAccountId,
        display_name: input.displayName ?? existing.displayName,
        token_encrypted: input.tokenEncrypted ?? existing.tokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        scopes: input.scopes ?? existing.scopes,
        expires_at: input.expiresAt ?? existing.expiresAt,
        metadata_json: mergedMetadata,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) return null;
    return mapProviderAccount(data as Record<string, unknown>);
  }

  const { data, error } = await admin
    .from("provider_accounts")
    .insert({
      organization_id: organizationId,
      provider,
      external_account_id: input.externalAccountId ?? null,
      display_name: input.displayName ?? null,
      token_encrypted: input.tokenEncrypted ?? null,
      refresh_token_encrypted: refreshTokenEncrypted,
      scopes: input.scopes ?? [],
      expires_at: input.expiresAt ?? null,
      metadata_json: mergedMetadata,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapProviderAccount(data as Record<string, unknown>);
}

export async function markProviderError(
  organizationId: string,
  provider: ProviderType,
  message: string,
  reauthRequired = false
) {
  const metadata = {
    last_error: message,
    reauth_required: reauthRequired,
    error_at: new Date().toISOString(),
  };
  return upsertProviderAccount(organizationId, provider, { metadata });
}

export async function clearProviderAccount(
  organizationId: string,
  provider: ProviderType
) {
  if (!isSupabaseConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin
    .from("provider_accounts")
    .delete()
    .eq("organization_id", organizationId)
    .eq("provider", provider);
}
