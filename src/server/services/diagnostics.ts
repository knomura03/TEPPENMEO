import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { getEnv, isSupabaseAdminConfigured, type Env } from "@/server/utils/env";
import { isProviderMockMode } from "@/server/utils/feature-flags";

export type EnvCheck = {
  key: string;
  required: boolean;
  present: boolean;
};

export const mockRequiredEnvKeys: readonly (keyof Env)[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "TOKEN_ENCRYPTION_KEY",
  "APP_BASE_URL",
] as const;

export const realRequiredEnvKeys: readonly (keyof Env)[] = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "META_APP_ID",
  "META_APP_SECRET",
  "META_REDIRECT_URI",
] as const;

function buildEnvChecks(
  keys: readonly (keyof Env)[],
  env: Env | null
): EnvCheck[] {
  const readValue = (key: keyof Env) => env?.[key] ?? process.env[key];
  return keys.map((key) => ({
    key,
    required: true,
    present: Boolean(readValue(key)),
  }));
}

export function getEnvCheckGroups(): {
  mockRequired: EnvCheck[];
  realRequired: EnvCheck[];
  envError: string | null;
  providerMockMode: boolean;
} {
  let envError: string | null = null;
  let env: Env | null = null;

  try {
    env = getEnv();
  } catch (error) {
    envError =
      error instanceof Error ? error.message : "環境変数の検証に失敗しました。";
  }

  const providerMockMode = isProviderMockMode();
  return {
    mockRequired: buildEnvChecks(mockRequiredEnvKeys, env),
    realRequired: buildEnvChecks(realRequiredEnvKeys, env),
    envError,
    providerMockMode,
  };
}

export async function checkSupabaseConnection(): Promise<{
  ok: boolean;
  message: string | null;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return { ok: false, message: "SupabaseのURLまたはANONキーが未設定です。" };
  }

  if (!serviceKey) {
    return { ok: false, message: "Supabaseのサービスキーが未設定です。" };
  }

  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { ok: false, message: "Supabaseの設定を確認してください。" };
    }

    const { error } = await admin.from("organizations").select("id").limit(1);
    if (error) {
      return {
        ok: false,
        message: "Supabaseに接続できません。URLとキーを再確認してください。",
      };
    }

    return { ok: true, message: null };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Supabaseに接続できません。URLとキーを再確認してください。",
    };
  }
}

export type UserBlocksSchemaCheck = {
  status: "ok" | "missing" | "unknown";
  issue: "table_missing" | "reason_missing" | "unknown" | null;
  message: string | null;
};

export type SetupProgressSchemaCheck = {
  status: "ok" | "missing" | "unknown";
  issue: "table_missing" | "unknown" | null;
  message: string | null;
};

export type MediaAssetsSchemaCheck = {
  status: "ok" | "missing" | "unknown";
  issue: "table_missing" | "unknown" | null;
  message: string | null;
};

export type JobRunsSchemaCheck = {
  status: "ok" | "missing" | "unknown";
  issue: "table_missing" | "unknown" | null;
  message: string | null;
};

export type JobSchedulesSchemaCheck = {
  status: "ok" | "missing" | "unknown";
  issue: "table_missing" | "unknown" | null;
  message: string | null;
};

export type JobRunsRunningIndexCheck = {
  status: "ok" | "missing" | "unknown";
  message: string | null;
};

export type AuditLogsIndexCheck = {
  status: "ok" | "missing" | "unknown";
  message: string | null;
  missingIndexes: string[];
};

const auditLogsIndexLabels: Record<string, string> = {
  audit_logs_created_at_idx: "created_at",
  audit_logs_action_created_at_idx: "action + created_at",
  audit_logs_org_created_at_idx: "organization_id + created_at",
  audit_logs_actor_created_at_idx: "actor_user_id + created_at",
};

export function resolveUserBlocksSchemaStatus(
  error: { code?: string; message?: string } | null
): UserBlocksSchemaCheck {
  if (!error) {
    return { status: "ok", issue: null, message: null };
  }

  if (error.code === "42P01") {
    return {
      status: "missing",
      issue: "table_missing",
      message: "user_blocks テーブルが見つかりません。",
    };
  }

  if (error.code === "42703") {
    return {
      status: "missing",
      issue: "reason_missing",
      message: "user_blocks の reason カラムが見つかりません。",
    };
  }

  return {
    status: "unknown",
    issue: "unknown",
    message:
      error.message ?? "user_blocks の確認に失敗しました。設定を確認してください。",
  };
}

export function resolveSetupProgressSchemaStatus(
  error: { code?: string; message?: string } | null
): SetupProgressSchemaCheck {
  if (!error) {
    return { status: "ok", issue: null, message: null };
  }

  if (error.code === "42P01") {
    return {
      status: "missing",
      issue: "table_missing",
      message: "setup_progress テーブルが見つかりません。",
    };
  }

  return {
    status: "unknown",
    issue: "unknown",
    message:
      error.message ?? "setup_progress の確認に失敗しました。設定を確認してください。",
  };
}

export function resolveMediaAssetsSchemaStatus(
  error: { code?: string; message?: string } | null
): MediaAssetsSchemaCheck {
  if (!error) {
    return { status: "ok", issue: null, message: null };
  }

  if (error.code === "42P01") {
    return {
      status: "missing",
      issue: "table_missing",
      message: "media_assets テーブルが見つかりません。",
    };
  }

  return {
    status: "unknown",
    issue: "unknown",
    message:
      error.message ?? "media_assets の確認に失敗しました。設定を確認してください。",
  };
}

export function resolveJobRunsSchemaStatus(
  error: { code?: string; message?: string } | null
): JobRunsSchemaCheck {
  if (!error) {
    return { status: "ok", issue: null, message: null };
  }

  if (error.code === "42P01") {
    return {
      status: "missing",
      issue: "table_missing",
      message: "job_runs テーブルが見つかりません。",
    };
  }

  return {
    status: "unknown",
    issue: "unknown",
    message:
      error.message ?? "job_runs の確認に失敗しました。設定を確認してください。",
  };
}

export function resolveJobSchedulesSchemaStatus(
  error: { code?: string; message?: string } | null
): JobSchedulesSchemaCheck {
  if (!error) {
    return { status: "ok", issue: null, message: null };
  }

  if (error.code === "42P01") {
    return {
      status: "missing",
      issue: "table_missing",
      message: "job_schedules テーブルが見つかりません。",
    };
  }

  return {
    status: "unknown",
    issue: "unknown",
    message:
      error.message ?? "job_schedules の確認に失敗しました。設定を確認してください。",
  };
}

function isMissingJobRunsRunningIndexFunction(error: {
  code?: string;
  message?: string;
}) {
  if (!error) return false;
  if (error.code === "42883" || error.code === "PGRST202") return true;
  return Boolean(error.message?.includes("job_runs_running_unique_status"));
}

export function resolveJobRunsRunningIndexStatus(
  data: Record<string, boolean> | null,
  error: { code?: string; message?: string } | null
): JobRunsRunningIndexCheck {
  if (error) {
    if (isMissingJobRunsRunningIndexFunction(error)) {
      return {
        status: "missing",
        message:
          "job_runs の重複防止インデックス判定が見つかりません。マイグレーションを適用してください。",
      };
    }
    return {
      status: "unknown",
      message:
        error.message ??
        "job_runs の重複防止インデックス確認に失敗しました。設定を確認してください。",
    };
  }

  if (!data) {
    return {
      status: "unknown",
      message: "job_runs の重複防止インデックス結果が取得できませんでした。",
    };
  }

  const ok = Boolean(data.job_runs_running_unique_idx);
  return ok
    ? { status: "ok", message: null }
    : {
        status: "missing",
        message: "job_runs の重複防止インデックスが未適用です。",
      };
}

function isMissingAuditLogsIndexFunction(error: {
  code?: string;
  message?: string;
}) {
  if (!error) return false;
  if (error.code === "42883" || error.code === "PGRST202") return true;
  return Boolean(error.message?.includes("audit_logs_indexes_status"));
}

export function resolveAuditLogsIndexStatus(
  data: Record<string, boolean> | null,
  error: { code?: string; message?: string } | null
): AuditLogsIndexCheck {
  if (error) {
    if (isMissingAuditLogsIndexFunction(error)) {
      return {
        status: "missing",
        message:
          "監査ログのインデックス判定関数が見つかりません。マイグレーションを適用してください。",
        missingIndexes: Object.values(auditLogsIndexLabels),
      };
    }
    return {
      status: "unknown",
      message:
        error.message ??
        "監査ログインデックスの確認に失敗しました。設定を確認してください。",
      missingIndexes: [],
    };
  }

  if (!data) {
    return {
      status: "unknown",
      message: "監査ログインデックスの確認結果が取得できませんでした。",
      missingIndexes: [],
    };
  }

  const missingIndexes = Object.entries(auditLogsIndexLabels)
    .filter(([key]) => !data[key])
    .map(([, label]) => label);

  if (missingIndexes.length === 0) {
    return { status: "ok", message: null, missingIndexes };
  }

  return {
    status: "missing",
    message: `監査ログのインデックスが未適用です（${missingIndexes.join(", ")}）。`,
    missingIndexes,
  };
}

export async function checkUserBlocksSchema(): Promise<UserBlocksSchemaCheck> {
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "unknown",
      issue: "unknown",
      message: "Supabaseのサービスキーが未設定のため判定できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      status: "unknown",
      issue: "unknown",
      message: "Supabaseの設定を確認してください。",
    };
  }

  const { error } = await admin
    .from("user_blocks")
    .select("user_id, reason")
    .limit(1);

  return resolveUserBlocksSchemaStatus(error);
}

export async function checkSetupProgressSchema(): Promise<SetupProgressSchemaCheck> {
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "unknown",
      issue: "unknown",
      message: "Supabaseのサービスキーが未設定のため判定できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      status: "unknown",
      issue: "unknown",
      message: "Supabaseの設定を確認してください。",
    };
  }

  const { error } = await admin.from("setup_progress").select("id").limit(1);

  return resolveSetupProgressSchemaStatus(error);
}

export async function checkMediaAssetsSchema(): Promise<MediaAssetsSchemaCheck> {
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "unknown",
      issue: "unknown",
      message: "Supabaseのサービスキーが未設定のため判定できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      status: "unknown",
      issue: "unknown",
      message: "Supabaseの設定を確認してください。",
    };
  }

  const { error } = await admin.from("media_assets").select("id").limit(1);

  return resolveMediaAssetsSchemaStatus(error);
}

export async function checkJobRunsSchema(): Promise<JobRunsSchemaCheck> {
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "unknown",
      issue: "unknown",
      message: "Supabaseのサービスキーが未設定のため判定できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      status: "unknown",
      issue: "unknown",
      message: "Supabaseの設定を確認してください。",
    };
  }

  const { error } = await admin.from("job_runs").select("id").limit(1);

  return resolveJobRunsSchemaStatus(error);
}

export async function checkJobSchedulesSchema(): Promise<JobSchedulesSchemaCheck> {
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "unknown",
      issue: "unknown",
      message: "Supabaseのサービスキーが未設定のため判定できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      status: "unknown",
      issue: "unknown",
      message: "Supabaseの設定を確認してください。",
    };
  }

  const { error } = await admin.from("job_schedules").select("id").limit(1);

  return resolveJobSchedulesSchemaStatus(error);
}

export async function checkJobRunsRunningIndex(): Promise<JobRunsRunningIndexCheck> {
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "unknown",
      message: "Supabaseのサービスキーが未設定のため判定できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      status: "unknown",
      message: "Supabaseの設定を確認してください。",
    };
  }

  const { data, error } = await admin.rpc("job_runs_running_unique_status");
  const payload =
    data && typeof data === "object" ? (data as Record<string, boolean>) : null;

  return resolveJobRunsRunningIndexStatus(payload, error);
}

export async function checkAuditLogsIndexes(): Promise<AuditLogsIndexCheck> {
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "unknown",
      message: "Supabaseのサービスキーが未設定のため判定できません。",
      missingIndexes: [],
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      status: "unknown",
      message: "Supabaseの設定を確認してください。",
      missingIndexes: [],
    };
  }

  const { data, error } = await admin.rpc("audit_logs_indexes_status");
  const payload =
    data && typeof data === "object" ? (data as Record<string, boolean>) : null;

  return resolveAuditLogsIndexStatus(payload, error);
}
