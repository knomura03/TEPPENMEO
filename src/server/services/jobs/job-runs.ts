import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/server/utils/env";
import { mockJobRuns } from "@/server/services/mock-data";

export type JobRunStatus = "running" | "succeeded" | "failed" | "partial";

export type JobRunSummary = {
  totalLocations?: number;
  successCount?: number;
  failedCount?: number;
  reviewCount?: number;
  mockMode?: boolean;
};

export type JobRun = {
  id: string;
  organizationId: string;
  jobKey: string;
  status: JobRunStatus;
  startedAt: string;
  finishedAt: string | null;
  summary: JobRunSummary;
  error: Record<string, unknown>;
  actorUserId: string | null;
  createdAt: string;
  organizationName?: string | null;
};

export type JobRunItem = {
  id: string;
  jobRunId: string;
  locationId: string | null;
  status: JobRunStatus;
  count: number | null;
  error: Record<string, unknown>;
  createdAt: string;
};

function mapJobRun(row: Record<string, unknown>): JobRun {
  const organization = row.organizations as { name?: string } | null;
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    jobKey: row.job_key as string,
    status: row.status as JobRunStatus,
    startedAt: row.started_at as string,
    finishedAt: (row.finished_at as string | null) ?? null,
    summary: (row.summary_json as JobRunSummary) ?? {},
    error: (row.error_json as Record<string, unknown>) ?? {},
    actorUserId: (row.actor_user_id as string | null) ?? null,
    createdAt: row.created_at as string,
    organizationName: organization?.name ?? null,
  };
}

function mapJobRunItem(row: Record<string, unknown>): JobRunItem {
  return {
    id: row.id as string,
    jobRunId: row.job_run_id as string,
    locationId: (row.location_id as string | null) ?? null,
    status: row.status as JobRunStatus,
    count: (row.count as number | null) ?? null,
    error: (row.error_json as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  };
}

export async function createJobRun(params: {
  organizationId: string;
  jobKey: string;
  actorUserId: string | null;
}): Promise<{ ok: boolean; runId: string | null; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, runId: null, reason: "Supabaseが未設定のため実行できません。" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      runId: null,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため実行できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, runId: null, reason: "Supabaseの設定を確認してください。" };
  }

  const { data, error } = await admin
    .from("job_runs")
    .insert({
      organization_id: params.organizationId,
      job_key: params.jobKey,
      status: "running",
      started_at: new Date().toISOString(),
      actor_user_id: params.actorUserId,
      summary_json: {},
      error_json: {},
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        runId: null,
        reason: "すでに実行中のため開始できません。",
      };
    }
    if (error?.code === "42P01") {
      return {
        ok: false,
        runId: null,
        reason: "job_runs マイグレーションが未適用のため実行できません。",
      };
    }
    return {
      ok: false,
      runId: null,
      reason: error?.message ?? "ジョブの開始に失敗しました。",
    };
  }

  return { ok: true, runId: data.id as string, reason: null };
}

export async function hasRunningJobRun(params: {
  organizationId: string;
  jobKey: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error } = await admin
    .from("job_runs")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("job_key", params.jobKey)
    .eq("status", "running")
    .limit(1);

  if (error || !data) return false;
  return data.length > 0;
}

export async function finalizeJobRun(params: {
  runId: string;
  status: JobRunStatus;
  summary: JobRunSummary;
  error?: Record<string, unknown> | null;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin
    .from("job_runs")
    .update({
      status: params.status,
      finished_at: new Date().toISOString(),
      summary_json: params.summary,
      error_json: params.error ?? {},
    })
    .eq("id", params.runId);
}

export async function insertJobRunItems(
  runId: string,
  items: Array<{
    locationId: string | null;
    status: JobRunStatus;
    count?: number | null;
    error?: Record<string, unknown> | null;
  }>
): Promise<void> {
  if (items.length === 0) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const payload = items.map((item) => ({
    job_run_id: runId,
    location_id: item.locationId,
    status: item.status,
    count: item.count ?? null,
    error_json: item.error ?? {},
  }));

  await admin.from("job_run_items").insert(payload);
}

export async function getLatestJobRun(params: {
  organizationId: string;
  jobKey: string;
}): Promise<JobRun | null> {
  if (!isSupabaseConfigured()) {
    return (
      mockJobRuns.find(
        (run) =>
          run.organizationId === params.organizationId &&
          run.jobKey === params.jobKey
      ) ?? null
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("job_runs")
    .select("*")
    .eq("organization_id", params.organizationId)
    .eq("job_key", params.jobKey)
    .order("started_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return mapJobRun(data[0] as Record<string, unknown>);
}

export async function listJobRuns(params: {
  limit?: number;
  organizationId?: string | null;
}): Promise<JobRun[]> {
  if (!isSupabaseConfigured()) {
    return params.organizationId
      ? mockJobRuns.filter((run) => run.organizationId === params.organizationId)
      : mockJobRuns;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  let query = admin
    .from("job_runs")
    .select("*, organizations(name)")
    .order("started_at", { ascending: false });

  if (params.organizationId) {
    query = query.eq("organization_id", params.organizationId);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => mapJobRun(row as Record<string, unknown>));
}

export async function listJobRunItems(runId: string): Promise<JobRunItem[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("job_run_items")
    .select("*")
    .eq("job_run_id", runId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => mapJobRunItem(row as Record<string, unknown>));
}
