import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import {
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/server/utils/env";

export const allowedCadenceMinutes = [360, 1440] as const;
export type JobScheduleCadence = (typeof allowedCadenceMinutes)[number];

export type JobSchedule = {
  id: string;
  organizationId: string;
  jobKey: string;
  enabled: boolean;
  cadenceMinutes: number;
  nextRunAt: string | null;
  lastEnqueuedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapJobSchedule(row: Record<string, unknown>): JobSchedule {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    jobKey: row.job_key as string,
    enabled: row.enabled as boolean,
    cadenceMinutes: row.cadence_minutes as number,
    nextRunAt: (row.next_run_at as string | null) ?? null,
    lastEnqueuedAt: (row.last_enqueued_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function normalizeCadenceMinutes(value: number | null | undefined): JobScheduleCadence {
  if (value && allowedCadenceMinutes.includes(value as JobScheduleCadence)) {
    return value as JobScheduleCadence;
  }
  return 1440;
}

export async function getJobSchedule(params: {
  organizationId: string;
  jobKey: string;
}): Promise<JobSchedule | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("job_schedules")
    .select("*")
    .eq("organization_id", params.organizationId)
    .eq("job_key", params.jobKey)
    .maybeSingle();

  if (error || !data) return null;
  return mapJobSchedule(data as Record<string, unknown>);
}

export async function upsertJobSchedule(params: {
  organizationId: string;
  jobKey: string;
  enabled: boolean;
  cadenceMinutes: number;
}): Promise<{ ok: boolean; schedule: JobSchedule | null; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, schedule: null, reason: "Supabaseが未設定のため保存できません。" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      schedule: null,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため保存できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, schedule: null, reason: "Supabaseの設定を確認してください。" };
  }

  const cadenceMinutes = normalizeCadenceMinutes(params.cadenceMinutes);
  const now = new Date();
  const nextRunAt = params.enabled
    ? new Date(now.getTime() + cadenceMinutes * 60 * 1000).toISOString()
    : null;

  const { data, error } = await admin
    .from("job_schedules")
    .upsert(
      {
        organization_id: params.organizationId,
        job_key: params.jobKey,
        enabled: params.enabled,
        cadence_minutes: cadenceMinutes,
        next_run_at: nextRunAt,
        updated_at: now.toISOString(),
      },
      { onConflict: "organization_id,job_key" }
    )
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "42P01") {
      return {
        ok: false,
        schedule: null,
        reason: "job_schedules マイグレーションが未適用のため保存できません。",
      };
    }
    return {
      ok: false,
      schedule: null,
      reason: error?.message ?? "スケジュールの保存に失敗しました。",
    };
  }

  return { ok: true, schedule: mapJobSchedule(data as Record<string, unknown>), reason: null };
}

export async function updateJobScheduleTiming(params: {
  organizationId: string;
  jobKey: string;
  nextRunAt: string | null;
  lastEnqueuedAt: string | null;
}): Promise<{ ok: boolean; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "Supabaseが未設定のため更新できません。" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため更新できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, reason: "Supabaseの設定を確認してください。" };
  }

  const { error } = await admin
    .from("job_schedules")
    .update({
      next_run_at: params.nextRunAt,
      last_enqueued_at: params.lastEnqueuedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", params.organizationId)
    .eq("job_key", params.jobKey);

  if (error) {
    return { ok: false, reason: error.message ?? "更新に失敗しました。" };
  }

  return { ok: true, reason: null };
}

export async function listDueJobSchedules(params: {
  jobKey: string;
  now?: Date;
  limit?: number;
}): Promise<{ ok: boolean; schedules: JobSchedule[]; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, schedules: [], reason: "Supabaseが未設定のため実行できません。" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      schedules: [],
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため実行できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, schedules: [], reason: "Supabaseの設定を確認してください。" };
  }

  const now = params.now ?? new Date();
  const nowIso = now.toISOString();

  let query = admin
    .from("job_schedules")
    .select("*")
    .eq("job_key", params.jobKey)
    .eq("enabled", true)
    .or(`next_run_at.lte.${nowIso},next_run_at.is.null`)
    .order("next_run_at", { ascending: true, nullsFirst: true });

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === "42P01") {
      return {
        ok: false,
        schedules: [],
        reason: "job_schedules マイグレーションが未適用のため実行できません。",
      };
    }
    return {
      ok: false,
      schedules: [],
      reason: error.message ?? "スケジュールの取得に失敗しました。",
    };
  }

  return {
    ok: true,
    schedules: (data ?? []).map((row) => mapJobSchedule(row as Record<string, unknown>)),
    reason: null,
  };
}

export async function countEnabledJobSchedules(params: {
  jobKey: string;
}): Promise<{ count: number | null; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { count: null, reason: "Supabaseが未設定のため取得できません。" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      count: null,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため取得できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { count: null, reason: "Supabaseの設定を確認してください。" };
  }

  const { count, error } = await admin
    .from("job_schedules")
    .select("id", { count: "exact", head: true })
    .eq("job_key", params.jobKey)
    .eq("enabled", true);

  if (error) {
    if (error.code === "42P01") {
      return { count: null, reason: "job_schedules が未適用のため取得できません。" };
    }
    return { count: null, reason: error.message ?? "件数の取得に失敗しました。" };
  }

  return { count: count ?? 0, reason: null };
}
