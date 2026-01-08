import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { type ProviderType } from "@/server/providers/types";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/server/utils/env";

export type MediaAssetInput = {
  organizationId: string;
  uploadedByUserId: string | null;
  provider?: ProviderType | null;
  bucket: string;
  path: string;
  bytes?: number | null;
  mimeType?: string | null;
};

export type MediaAssetSummary = {
  uploadedCount: number | null;
  lastUploadedAt: string | null;
  reason: string | null;
};

export async function recordMediaAsset(
  params: MediaAssetInput
): Promise<{ ok: boolean; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: "Supabaseが未設定のため記録できません。",
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため記録できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, reason: "Supabaseの設定を確認してください。" };
  }

  const { error } = await admin.from("media_assets").insert({
    organization_id: params.organizationId,
    uploaded_by_user_id: params.uploadedByUserId,
    provider: params.provider ?? null,
    bucket: params.bucket,
    path: params.path,
    bytes: params.bytes ?? null,
    mime_type: params.mimeType ?? null,
  });

  if (error) {
    if (error.code === "42P01") {
      return {
        ok: false,
        reason:
          "media_assets マイグレーションが未適用のため記録できません。",
      };
    }
    return {
      ok: false,
      reason: error.message ?? "アップロード記録に失敗しました。",
    };
  }

  return { ok: true, reason: null };
}

export async function getMediaAssetSummary(
  organizationId: string
): Promise<MediaAssetSummary> {
  if (!isSupabaseConfigured()) {
    return {
      uploadedCount: null,
      lastUploadedAt: null,
      reason: "Supabaseが未設定のため集計できません。",
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      uploadedCount: null,
      lastUploadedAt: null,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため集計できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      uploadedCount: null,
      lastUploadedAt: null,
      reason: "Supabaseの設定を確認してください。",
    };
  }

  const { count, error: countError } = await admin
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (countError) {
    if (countError.code === "42P01") {
      return {
        uploadedCount: null,
        lastUploadedAt: null,
        reason:
          "media_assets マイグレーションが未適用のため集計できません。",
      };
    }
    return {
      uploadedCount: null,
      lastUploadedAt: null,
      reason: countError.message ?? "アップロード件数の集計に失敗しました。",
    };
  }

  const { data, error: lastError } = await admin
    .from("media_assets")
    .select("created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (lastError) {
    return {
      uploadedCount: count ?? 0,
      lastUploadedAt: null,
      reason: lastError.message ?? "最終アップロードの取得に失敗しました。",
    };
  }

  const lastUploadedAt = (data?.[0] as { created_at?: string } | undefined)
    ?.created_at ?? null;

  return {
    uploadedCount: count ?? 0,
    lastUploadedAt,
    reason: null,
  };
}
