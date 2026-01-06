import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";

export type ReviewReply = {
  id: string;
  reviewId: string;
  provider: string;
  replyText: string;
  externalReplyId?: string | null;
  status: string;
  createdAt: string;
};

export async function listLatestReviewReplies(
  reviewIds: string[]
): Promise<Record<string, ReviewReply>> {
  if (!isSupabaseConfigured()) return {};
  if (reviewIds.length === 0) return {};

  const admin = getSupabaseAdmin();
  if (!admin) return {};

  const { data, error } = await admin
    .from("review_replies")
    .select("*")
    .in("review_id", reviewIds)
    .order("created_at", { ascending: false });

  if (error || !data) return {};

  const map: Record<string, ReviewReply> = {};
  for (const row of data) {
    if (map[row.review_id]) continue;
    map[row.review_id] = {
      id: row.id,
      reviewId: row.review_id,
      provider: row.provider,
      replyText: row.reply_text,
      externalReplyId: row.external_reply_id,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  return map;
}

export async function createReviewReply(input: {
  reviewId: string;
  provider: string;
  replyText: string;
  externalReplyId?: string | null;
  status: string;
}): Promise<ReviewReply | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: "mock-reply",
      reviewId: input.reviewId,
      provider: input.provider,
      replyText: input.replyText,
      externalReplyId: input.externalReplyId ?? null,
      status: input.status,
      createdAt: new Date().toISOString(),
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("review_replies")
    .insert({
      review_id: input.reviewId,
      provider: input.provider,
      reply_text: input.replyText,
      external_reply_id: input.externalReplyId ?? null,
      status: input.status,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    reviewId: data.review_id,
    provider: data.provider,
    replyText: data.reply_text,
    externalReplyId: data.external_reply_id,
    status: data.status,
    createdAt: data.created_at,
  };
}
