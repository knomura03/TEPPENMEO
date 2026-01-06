import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockPosts } from "@/server/services/mock-data";

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
