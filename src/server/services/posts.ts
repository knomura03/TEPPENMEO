import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockPosts } from "@/server/services/mock-data";
import { normalizeMediaEntries } from "@/server/services/media";

export type Post = {
  id: string;
  content: string;
  status: string;
  providers: string[];
  createdAt: string;
};

export async function listPostsForOrganization(
  organizationId: string
): Promise<Post[]> {
  if (!isSupabaseConfigured()) {
    return mockPosts;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("posts")
    .select("*, post_targets(provider)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    content: row.content,
    status: row.status,
    providers: row.post_targets?.map((target: { provider: string }) => target.provider) ?? [],
    createdAt: row.created_at,
  }));
}

export async function createPostRecord(input: {
  organizationId: string;
  locationId?: string | null;
  content: string;
  media: unknown;
  status: string;
}): Promise<{ id: string } | null> {
  if (!isSupabaseConfigured()) {
    return { id: "mock-post" };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("posts")
    .insert({
      organization_id: input.organizationId,
      location_id: input.locationId ?? null,
      content: input.content,
      media: normalizeMediaEntries(input.media),
      status: input.status,
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return { id: data.id as string };
}

export async function updatePostStatus(
  postId: string,
  status: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin.from("posts").update({ status }).eq("id", postId);
}

export async function createPostTargetRecord(input: {
  postId: string;
  provider: string;
  status: string;
  externalPostId?: string | null;
  error?: string | null;
}): Promise<{ id: string } | null> {
  if (!isSupabaseConfigured()) {
    return { id: "mock-target" };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("post_targets")
    .insert({
      post_id: input.postId,
      provider: input.provider,
      status: input.status,
      external_post_id: input.externalPostId ?? null,
      error: input.error ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return { id: data.id as string };
}

export async function updatePostTargetRecord(input: {
  id?: string | null;
  status: string;
  externalPostId?: string | null;
  error?: string | null;
}): Promise<void> {
  if (!input.id) return;
  if (!isSupabaseConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const updates: Record<string, unknown> = { status: input.status };
  if (input.externalPostId !== undefined) {
    updates.external_post_id = input.externalPostId;
  }
  if (input.error !== undefined) {
    updates.error = input.error;
  }

  await admin.from("post_targets").update(updates).eq("id", input.id);
}
