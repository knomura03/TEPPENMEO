import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/server/utils/env";

export const setupStepKeys = [
  "connect_google",
  "link_gbp_location",
  "post_test_google",
  "connect_meta",
  "link_fb_page",
  "post_test_meta",
  "enable_storage",
] as const;

export type SetupStepKey = (typeof setupStepKeys)[number];

export type SetupProgressRecord = {
  stepKey: SetupStepKey;
  isDone: boolean;
  doneAt: string | null;
  doneByUserId: string | null;
  note: string | null;
};

export function isValidSetupStepKey(value: string): value is SetupStepKey {
  return setupStepKeys.includes(value as SetupStepKey);
}

function mapProgressRow(row: Record<string, unknown>): SetupProgressRecord {
  return {
    stepKey: row.step_key as SetupStepKey,
    isDone: Boolean(row.is_done),
    doneAt: row.done_at as string | null,
    doneByUserId: row.done_by_user_id as string | null,
    note: row.note as string | null,
  };
}

export async function listSetupProgress(params: {
  organizationId: string;
}): Promise<{ records: SetupProgressRecord[]; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return {
      records: [],
      reason: "Supabaseが未設定のため保存状況を取得できません。",
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      records: [],
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため保存状況を取得できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      records: [],
      reason: "Supabaseの設定を確認してください。",
    };
  }

  const { data, error } = await admin
    .from("setup_progress")
    .select("*")
    .eq("organization_id", params.organizationId);

  if (error || !data) {
    if (error?.code === "42P01") {
      return {
        records: [],
        reason:
          "setup_progress マイグレーションが未適用のため保存状況を取得できません。",
      };
    }
    return {
      records: [],
      reason:
        error?.message ?? "セットアップ進捗の取得に失敗しました。",
    };
  }

  return {
    records: data.map((row) => mapProgressRow(row as Record<string, unknown>)),
    reason: null,
  };
}

export async function upsertSetupProgress(params: {
  organizationId: string;
  stepKey: SetupStepKey;
  isDone: boolean;
  doneByUserId?: string | null;
  note?: string | null;
}): Promise<{ ok: boolean; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "Supabaseが未設定のため保存できません。" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため保存できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, reason: "Supabaseの設定を確認してください。" };
  }

  const payload = {
    organization_id: params.organizationId,
    step_key: params.stepKey,
    is_done: params.isDone,
    done_at: params.isDone ? new Date().toISOString() : null,
    done_by_user_id: params.isDone ? params.doneByUserId ?? null : null,
    note: params.note ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("setup_progress")
    .upsert(payload, { onConflict: "organization_id,step_key" });

  if (error) {
    if (error.code === "42P01") {
      return {
        ok: false,
        reason:
          "setup_progress マイグレーションが未適用のため保存できません。",
      };
    }
    return {
      ok: false,
      reason: error.message ?? "セットアップ進捗の保存に失敗しました。",
    };
  }

  return { ok: true, reason: null };
}
