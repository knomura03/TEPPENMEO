import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { ProviderType } from "@/server/providers/types";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/server/utils/env";

type AcceptanceItem = {
  status: "ok" | "pending" | "unknown";
  lastSuccessAt: string | null;
  reason: string | null;
};

export type ReleaseAcceptanceStatus = {
  googleInboxFetch: AcceptanceItem;
  googleInboxReply: AcceptanceItem;
  googlePostPublish: AcceptanceItem;
  metaInboxFetch: AcceptanceItem;
  metaInboxReply: AcceptanceItem;
  metaPostPublish: AcceptanceItem;
  mediaUpload: AcceptanceItem;
};

function unknownItem(reason: string): AcceptanceItem {
  return { status: "unknown", lastSuccessAt: null, reason };
}

function pendingItem(reason: string): AcceptanceItem {
  return { status: "pending", lastSuccessAt: null, reason };
}

function okItem(lastSuccessAt: string | null): AcceptanceItem {
  return { status: "ok", lastSuccessAt, reason: null };
}

async function getLatestReview(provider: ProviderType, locationIds: string[]) {
  const admin = getSupabaseAdmin();
  if (!admin) return { createdAt: null, error: "Supabaseの設定を確認してください。" };

  const { data, error } = await admin
    .from("reviews")
    .select("created_at")
    .eq("provider", provider)
    .in("location_id", locationIds)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return { createdAt: null, error: error.message ?? "口コミの取得に失敗しました。" };
  }

  const createdAt = (data?.[0] as { created_at?: string } | undefined)?.created_at ?? null;
  return { createdAt, error: null };
}

async function getLatestReply(provider: ProviderType, locationIds: string[]) {
  const admin = getSupabaseAdmin();
  if (!admin) return { createdAt: null, error: "Supabaseの設定を確認してください。" };

  const { data, error } = await admin
    .from("review_replies")
    .select("created_at, reviews!inner(location_id)")
    .eq("provider", provider)
    .in("reviews.location_id", locationIds)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return { createdAt: null, error: error.message ?? "返信履歴の取得に失敗しました。" };
  }

  const createdAt = (data?.[0] as { created_at?: string } | undefined)?.created_at ?? null;
  return { createdAt, error: null };
}

async function getLatestPostTarget(provider: ProviderType, organizationId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return { createdAt: null, error: "Supabaseの設定を確認してください。" };

  const { data, error } = await admin
    .from("post_targets")
    .select("status, created_at, posts!inner(organization_id)")
    .eq("provider", provider)
    .eq("posts.organization_id", organizationId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return { createdAt: null, error: error.message ?? "投稿履歴の取得に失敗しました。" };
  }

  const createdAt = (data?.[0] as { created_at?: string } | undefined)?.created_at ?? null;
  return { createdAt, error: null };
}

async function getLatestMediaUpload(organizationId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return { createdAt: null, error: "Supabaseの設定を確認してください。" };

  const { data, error } = await admin
    .from("media_assets")
    .select("created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return { createdAt: null, error: error.message ?? "画像履歴の取得に失敗しました。" };
  }

  const createdAt = (data?.[0] as { created_at?: string } | undefined)?.created_at ?? null;
  return { createdAt, error: null };
}

export async function getReleaseAcceptanceStatus(params: {
  organizationId: string;
  locationIds: string[];
}): Promise<ReleaseAcceptanceStatus> {
  if (!isSupabaseConfigured()) {
    return {
      googleInboxFetch: unknownItem("Supabaseが未設定のため確認できません。"),
      googleInboxReply: unknownItem("Supabaseが未設定のため確認できません。"),
      googlePostPublish: unknownItem("Supabaseが未設定のため確認できません。"),
      metaInboxFetch: unknownItem("Supabaseが未設定のため確認できません。"),
      metaInboxReply: unknownItem("Supabaseが未設定のため確認できません。"),
      metaPostPublish: unknownItem("Supabaseが未設定のため確認できません。"),
      mediaUpload: unknownItem("Supabaseが未設定のため確認できません。"),
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      googleInboxFetch: unknownItem("SUPABASE_SERVICE_ROLE_KEY が未設定です。"),
      googleInboxReply: unknownItem("SUPABASE_SERVICE_ROLE_KEY が未設定です。"),
      googlePostPublish: unknownItem("SUPABASE_SERVICE_ROLE_KEY が未設定です。"),
      metaInboxFetch: unknownItem("SUPABASE_SERVICE_ROLE_KEY が未設定です。"),
      metaInboxReply: unknownItem("SUPABASE_SERVICE_ROLE_KEY が未設定です。"),
      metaPostPublish: unknownItem("SUPABASE_SERVICE_ROLE_KEY が未設定です。"),
      mediaUpload: unknownItem("SUPABASE_SERVICE_ROLE_KEY が未設定です。"),
    };
  }

  if (params.locationIds.length === 0) {
    return {
      googleInboxFetch: pendingItem("店舗が未登録のため判定できません。"),
      googleInboxReply: pendingItem("店舗が未登録のため判定できません。"),
      googlePostPublish: pendingItem("店舗が未登録のため判定できません。"),
      metaInboxFetch: pendingItem("店舗が未登録のため判定できません。"),
      metaInboxReply: pendingItem("店舗が未登録のため判定できません。"),
      metaPostPublish: pendingItem("店舗が未登録のため判定できません。"),
      mediaUpload: pendingItem("店舗が未登録のため判定できません。"),
    };
  }

  const [
    googleInbox,
    googleReply,
    metaInbox,
    metaReply,
    googlePost,
    metaPost,
    mediaUpload,
  ] = await Promise.all([
    getLatestReview(ProviderType.GoogleBusinessProfile, params.locationIds),
    getLatestReply(ProviderType.GoogleBusinessProfile, params.locationIds),
    getLatestReview(ProviderType.Meta, params.locationIds),
    getLatestReply(ProviderType.Meta, params.locationIds),
    getLatestPostTarget(ProviderType.GoogleBusinessProfile, params.organizationId),
    getLatestPostTarget(ProviderType.Meta, params.organizationId),
    getLatestMediaUpload(params.organizationId),
  ]);

  return {
    googleInboxFetch: googleInbox.createdAt
      ? okItem(googleInbox.createdAt)
      : pendingItem(googleInbox.error ?? "未実施です。"),
    googleInboxReply: googleReply.createdAt
      ? okItem(googleReply.createdAt)
      : pendingItem(googleReply.error ?? "未実施です。"),
    googlePostPublish: googlePost.createdAt
      ? okItem(googlePost.createdAt)
      : pendingItem(googlePost.error ?? "未実施です。"),
    metaInboxFetch: metaInbox.createdAt
      ? okItem(metaInbox.createdAt)
      : pendingItem(metaInbox.error ?? "未実施です。"),
    metaInboxReply: metaReply.createdAt
      ? okItem(metaReply.createdAt)
      : pendingItem(metaReply.error ?? "未実施です。"),
    metaPostPublish: metaPost.createdAt
      ? okItem(metaPost.createdAt)
      : pendingItem(metaPost.error ?? "未実施です。"),
    mediaUpload: mediaUpload.createdAt
      ? okItem(mediaUpload.createdAt)
      : pendingItem(mediaUpload.error ?? "未実施です。"),
  };
}
