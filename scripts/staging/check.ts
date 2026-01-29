import fs from "node:fs";
import { spawnSync } from "node:child_process";

import {
  applyEnvToProcess,
  checkCommandAvailable,
  checkCommandSuccess,
  printStatus,
  readEnvFile,
  resolveStagingEnvPath,
} from "./utils";

const envPath = resolveStagingEnvPath();
const envExists = fs.existsSync(envPath);
const envValues = envExists ? readEnvFile(envPath) : {};

console.log("staging:check（値は表示しません）");
printStatus(".env.staging.local", envExists, envExists ? "読み込み" : "未作成");

const hasSupabase = checkCommandAvailable("supabase", ["--version"]);
const hasVercel = checkCommandAvailable("vercel", ["--version"]);
printStatus("supabase CLI", hasSupabase);
printStatus("vercel CLI", hasVercel);

if (!hasSupabase || !hasVercel) {
  console.error("必要なCLIが見つかりません。インストール後に再実行してください。");
  process.exit(1);
}

const supabaseLoggedIn = checkCommandSuccess("supabase", ["projects", "list"]);
const vercelLoggedIn = checkCommandSuccess("vercel", ["whoami"]);
printStatus("Supabaseログイン", supabaseLoggedIn, "projects list");
printStatus("Vercelログイン", vercelLoggedIn, "whoami");

if (envExists) {
  applyEnvToProcess(envValues);
}

const preflight = spawnSync("pnpm", ["preflight", "--mode", "real", "--env", "staging"], {
  stdio: "inherit",
  env: process.env,
});

if (preflight.status !== 0) {
  process.exit(preflight.status ?? 1);
}
