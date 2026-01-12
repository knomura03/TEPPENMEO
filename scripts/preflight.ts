import { getEnvCheckGroups, checkSupabaseConnection } from "@/server/services/diagnostics";
import {
  checkAuditLogsIndexes,
  checkJobRunsRunningIndex,
  checkJobRunsSchema,
  checkJobSchedulesSchema,
  checkMediaAssetsSchema,
  checkSetupProgressSchema,
  checkUserBlocksSchema,
} from "@/server/services/diagnostics";
import { getMediaConfig, isStorageConfigured } from "@/server/services/media";
import { isProviderMockMode } from "@/server/utils/feature-flags";

type Mode = "mock" | "real";

function parseMode(): Mode {
  const arg = process.argv.find((item) => item.startsWith("--mode="));
  if (arg) {
    const value = arg.replace("--mode=", "");
    return value === "mock" ? "mock" : "real";
  }
  return isProviderMockMode() ? "mock" : "real";
}

async function main() {
  const mode = parseMode();
  const issues: string[] = [];
  const { mockRequired, realRequired, envError } = getEnvCheckGroups();

  if (envError) {
    issues.push(`環境変数の検証に失敗: ${envError}`);
  }

  const targetEnv = mode === "mock" ? mockRequired : [...mockRequired, ...realRequired];
  const missingEnv = targetEnv.filter((item) => !item.present);
  if (missingEnv.length > 0) {
    issues.push(
      `環境変数が不足/未設定: ${missingEnv
        .map((item) => item.key)
        .join(", ")}`
    );
  }

  const supabase = await checkSupabaseConnection();
  if (!supabase.ok) {
    issues.push(`Supabase接続 NG: ${supabase.message ?? "未設定"}`);
  }

  const storageReady = isStorageConfigured();
  const mediaConfig = getMediaConfig();
  if (mode === "real" && !storageReady) {
    issues.push("Storage未設定: バケットとサービスキーを確認してください。");
  } else if (mode === "mock" && !mediaConfig.bucket) {
    // 情報のみ
    console.log("INFO: モック運用のためStorage未設定でも続行します。");
  }

  if (mode === "real" && !process.env.CRON_SECRET) {
    issues.push("CRON_SECRET 未設定: スケジュール機能を有効にする場合は設定してください。");
  }

  const schemaChecks = await Promise.all([
    checkUserBlocksSchema(),
    checkSetupProgressSchema(),
    checkMediaAssetsSchema(),
    checkJobRunsSchema(),
    checkJobSchedulesSchema(),
    checkJobRunsRunningIndex(),
    checkAuditLogsIndexes(),
  ]);

  const schemaMessages = [
    { label: "user_blocks", status: schemaChecks[0].status, message: schemaChecks[0].message },
    { label: "setup_progress", status: schemaChecks[1].status, message: schemaChecks[1].message },
    { label: "media_assets", status: schemaChecks[2].status, message: schemaChecks[2].message },
    { label: "job_runs", status: schemaChecks[3].status, message: schemaChecks[3].message },
    { label: "job_schedules", status: schemaChecks[4].status, message: schemaChecks[4].message },
    { label: "job_runs 重複防止", status: schemaChecks[5].status, message: schemaChecks[5].message },
    {
      label: "audit_logs インデックス",
      status: schemaChecks[6].status,
      message:
        schemaChecks[6].status === "missing"
          ? `不足: ${schemaChecks[6].missingIndexes.join(", ")}`
          : schemaChecks[6].message,
    },
  ];

  schemaMessages.forEach((item) => {
    if (item.status !== "ok") {
      issues.push(`マイグレーション未適用: ${item.label} ${item.message ?? ""}`.trim());
    }
  });

  if (issues.length === 0) {
    console.log(`preflight OK (${mode}モード). 未設定はありません。`);
    process.exit(0);
  }

  console.error("preflight NG");
  issues.forEach((issue) => console.error(`- ${issue}`));
  console.error("次にやること: Runbook（staging/prodリリース）を参照し、未設定を解消してください。値は表示しません。");
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
