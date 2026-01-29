import fs from "node:fs";
import { spawnSync } from "node:child_process";

import { printStatus, readEnvFile, resolveStagingEnvPath } from "./utils";

const envPath = resolveStagingEnvPath();
if (!fs.existsSync(envPath)) {
  console.error(".env.staging.local が見つかりません。作成してから実行してください。");
  process.exit(1);
}

const envValues = readEnvFile(envPath);
const vercelEnv = process.env.STAGING_VERCEL_ENV ?? "preview";
const force = process.env.STAGING_VERCEL_FORCE === "1";

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_BASE_URL",
  "TOKEN_ENCRYPTION_KEY",
  "PROVIDER_MOCK_MODE",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "META_APP_ID",
  "META_APP_SECRET",
  "META_REDIRECT_URI",
  "SUPABASE_STORAGE_BUCKET",
  "MEDIA_SIGNED_URL_TTL_SECONDS",
  "CRON_SECRET",
  "PUBLIC_OPERATOR_NAME",
  "PUBLIC_CONTACT_EMAIL",
  "PUBLIC_CONTACT_URL",
  "PUBLIC_PRIVACY_EFFECTIVE_DATE",
  "PUBLIC_TERMS_EFFECTIVE_DATE",
];

console.log("staging:vercel:env-push（値は表示しません）");
console.log(`対象環境: ${vercelEnv}`);

const missing: string[] = [];
const failed: string[] = [];

keys.forEach((key) => {
  const value = envValues[key];
  if (!value) {
    missing.push(key);
    return;
  }
  const args = ["env", "add", key, vercelEnv];
  if (force) args.push("--force");
  const result = spawnSync("vercel", args, {
    input: `${value}\n`,
    stdio: ["pipe", "ignore", "ignore"],
  });
  if (result.status !== 0) {
    failed.push(key);
  }
});

keys.forEach((key) => {
  if (missing.includes(key)) {
    printStatus(key, false, "未設定");
    return;
  }
  if (failed.includes(key)) {
    printStatus(key, false, "要確認");
    return;
  }
  printStatus(key, true);
});

if (failed.length > 0) {
  console.error("一部の環境変数で投入に失敗しました。Vercelの状態を確認してください。");
  process.exit(1);
}
