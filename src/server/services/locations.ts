import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockLocations } from "@/server/services/mock-data";

export type Location = {
  id: string;
  organizationId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type CreateLocationInput = {
  organizationId: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function listLocations(
  organizationId: string
): Promise<Location[]> {
  if (!isSupabaseConfigured()) {
    return mockLocations.filter((loc) => loc.organizationId === organizationId);
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("locations")
    .select("*")
    .eq("organization_id", organizationId);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    address: row.address,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
  }));
}

export async function createLocation(
  input: CreateLocationInput
): Promise<Location | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("locations")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      address: input.address ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    address: data.address,
    city: data.city,
    region: data.region,
    postalCode: data.postal_code,
    country: data.country,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

export async function getLocationById(
  locationId: string
): Promise<Location | null> {
  if (!isSupabaseConfigured()) {
    return mockLocations.find((loc) => loc.id === locationId) ?? null;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("locations")
    .select("*")
    .eq("id", locationId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    address: data.address,
    city: data.city,
    region: data.region,
    postalCode: data.postal_code,
    country: data.country,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}
