import { ProviderType } from "@/server/providers/types";
import { normalizeMediaEntries, type MediaItem } from "@/server/services/media";
import { isSupabaseConfigured } from "@/server/utils/env";
import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { mockPostHistory } from "@/server/services/mock-data";

export type PostTargetInfo = {
  provider: ProviderType;
  status: string;
  error?: string | null;
  externalPostId?: string | null;
};

export type PostHistoryItem = {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  media: MediaItem[];
  targets: PostTargetInfo[];
};

export async function listPostsForLocation(params: {
  organizationId: string;
  locationId: string;
}): Promise<PostHistoryItem[]> {
  if (!isSupabaseConfigured()) {
    return mockPostHistory
      .filter((post) => post.locationId === params.locationId)
      .map((post) => ({
        id: post.id,
        content: post.content,
        status: post.status,
        createdAt: post.createdAt,
        media: normalizeMediaEntries(post.media),
        targets: post.targets,
      }));
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("posts")
    .select("id, content, status, created_at, media, post_targets(provider, status, error, external_post_id)")
    .eq("organization_id", params.organizationId)
    .eq("location_id", params.locationId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    content: row.content as string,
    status: row.status as string,
    createdAt: row.created_at as string,
    media: normalizeMediaEntries(row.media),
    targets:
      row.post_targets?.map((target: { provider: ProviderType; status: string; error?: string | null; external_post_id?: string | null }) => ({
        provider: target.provider,
        status: target.status,
        error: target.error ?? null,
        externalPostId: target.external_post_id ?? null,
      })) ?? [],
  }));
}
