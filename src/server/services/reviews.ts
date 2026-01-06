import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockReviews } from "@/server/services/mock-data";

export type Review = {
  id: string;
  provider: string;
  rating: number;
  comment?: string | null;
  author?: string | null;
  createdAt: string;
};

export async function listReviewsForLocation(
  locationId: string
): Promise<Review[]> {
  if (!isSupabaseConfigured()) {
    return mockReviews[locationId] ?? [];
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("reviews")
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    provider: row.provider,
    rating: row.rating,
    comment: row.comment,
    author: row.author,
    createdAt: row.created_at,
  }));
}
