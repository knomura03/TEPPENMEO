import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { envBool, getEnv, isSupabaseAdminConfigured } from "@/server/utils/env";

export type EnvCheck = {
  key: string;
  required: boolean;
  present: boolean;
};

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TOKEN_ENCRYPTION_KEY",
  "APP_BASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
] as const;

type RequiredEnvKey = (typeof requiredEnvKeys)[number];

export function getEnvChecks(): {
  checks: EnvCheck[];
  envError: string | null;
  providerMockMode: boolean;
} {
  let envError: string | null = null;
  let env: ReturnType<typeof getEnv> | null = null;

  try {
    env = getEnv();
  } catch (error) {
    envError =
      error instanceof Error ? error.message : "環境変数の検証に失敗しました。";
  }

  const readValue = (key: RequiredEnvKey) =>
    env?.[key] ?? process.env[key];

  const checks = requiredEnvKeys.map((key) => ({
    key,
    required: true,
    present: Boolean(readValue(key)),
  }));

  const mockValue = env?.PROVIDER_MOCK_MODE ?? process.env.PROVIDER_MOCK_MODE;
  const providerMockMode = envBool(mockValue, false);

  return { checks, envError, providerMockMode };
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
