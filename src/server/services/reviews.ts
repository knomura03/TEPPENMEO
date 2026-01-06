import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockReviews } from "@/server/services/mock-data";

export type Review = {
  id: string;
  provider: string;
  externalReviewId: string;
  locationId: string;
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
    externalReviewId: row.external_review_id,
    locationId: row.location_id,
    rating: row.rating,
    comment: row.comment,
    author: row.author,
    createdAt: row.created_at,
  }));
}

export async function getReviewById(reviewId: string): Promise<Review | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("reviews")
    .select("*")
    .eq("id", reviewId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    provider: data.provider,
    externalReviewId: data.external_review_id,
    locationId: data.location_id,
    rating: data.rating,
    comment: data.comment,
    author: data.author,
    createdAt: data.created_at,
  };
}

export async function upsertReviews(
  reviews: Array<{
    provider: string;
    externalReviewId: string;
    locationId: string;
    author?: string | null;
    rating: number;
    comment?: string | null;
    createdAt: string;
  }>
): Promise<number> {
  if (!isSupabaseConfigured()) return reviews.length;
  if (reviews.length === 0) return 0;

  const admin = getSupabaseAdmin();
  if (!admin) return 0;

  const payload = reviews.map((review) => ({
    provider: review.provider,
    external_review_id: review.externalReviewId,
    location_id: review.locationId,
    author: review.author ?? null,
    rating: review.rating,
    comment: review.comment ?? null,
    created_at: review.createdAt,
  }));

  const { error } = await admin
    .from("reviews")
    .upsert(payload, { onConflict: "provider,external_review_id" });

  if (error) return 0;
  return reviews.length;
}
