import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { ProviderType } from "@/server/providers/types";
import { mockLocationProviderLinks } from "@/server/services/mock-data";
import { isSupabaseConfigured } from "@/server/utils/env";

export type LocationProviderLink = {
  id: string;
  locationId: string;
  provider: ProviderType;
  externalLocationId: string;
  metadata: Record<string, unknown>;
};

function mapLocationProviderLink(
  row: Record<string, unknown>
): LocationProviderLink {
  return {
    id: row.id as string,
    locationId: row.location_id as string,
    provider: row.provider as ProviderType,
    externalLocationId: row.external_location_id as string,
    metadata: (row.metadata_json as Record<string, unknown>) ?? {},
  };
}

export async function getLocationProviderLink(
  locationId: string,
  provider: ProviderType
): Promise<LocationProviderLink | null> {
  if (!isSupabaseConfigured()) {
    return (
      mockLocationProviderLinks.find(
        (link) => link.locationId === locationId && link.provider === provider
      ) ?? null
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("location_provider_links")
    .select("*")
    .eq("location_id", locationId)
    .eq("provider", provider)
    .maybeSingle();

  if (error || !data) return null;
  return mapLocationProviderLink(data as Record<string, unknown>);
}

export async function upsertLocationProviderLink(input: {
  locationId: string;
  provider: ProviderType;
  externalLocationId: string;
  metadata?: Record<string, unknown>;
}): Promise<LocationProviderLink | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: "mock-link",
      locationId: input.locationId,
      provider: input.provider,
      externalLocationId: input.externalLocationId,
      metadata: input.metadata ?? {},
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("location_provider_links")
    .upsert(
      {
        location_id: input.locationId,
        provider: input.provider,
        external_location_id: input.externalLocationId,
        metadata_json: input.metadata ?? {},
      },
      { onConflict: "location_id,provider" }
    )
    .select("*")
    .single();

  if (error || !data) return null;
  return mapLocationProviderLink(data as Record<string, unknown>);
}

export async function updateLocationProviderLinkMetadata(input: {
  locationId: string;
  provider: ProviderType;
  metadata: Record<string, unknown>;
}): Promise<LocationProviderLink | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const existing = await getLocationProviderLink(input.locationId, input.provider);
  const merged = {
    ...(existing?.metadata ?? {}),
    ...input.metadata,
  };

  const { data, error } = await admin
    .from("location_provider_links")
    .update({ metadata_json: merged })
    .eq("location_id", input.locationId)
    .eq("provider", input.provider)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapLocationProviderLink(data as Record<string, unknown>);
}

export async function deleteLocationProviderLink(input: {
  locationId: string;
  provider: ProviderType;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin
    .from("location_provider_links")
    .delete()
    .eq("location_id", input.locationId)
    .eq("provider", input.provider);
}
