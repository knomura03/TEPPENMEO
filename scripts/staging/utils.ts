import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const STAGING_ENV_FILENAME = ".env.staging.local";

export function resolveStagingEnvPath() {
  return path.join(process.cwd(), STAGING_ENV_FILENAME);
}

export function readEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const result: Record<string, string> = {};
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const normalized = trimmed.startsWith("export ")
      ? trimmed.replace(/^export\s+/, "")
      : trimmed;
    const equalIndex = normalized.indexOf("=");
    if (equalIndex < 0) return;
    const key = normalized.slice(0, equalIndex).trim();
    let value = normalized.slice(equalIndex + 1).trim();
    if (!key) return;
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  });
  return result;
}

export function checkCommandAvailable(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "ignore" });
  return result.status === 0;
}

export function checkCommandSuccess(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "ignore" });
  return result.status === 0;
}

export function printStatus(label: string, ok: boolean, note?: string) {
  const status = ok ? "OK" : "NG";
  const suffix = note ? `（${note}）` : "";
  console.log(`${label}: ${status}${suffix}`);
}

export function applyEnvToProcess(env: Record<string, string>) {
  Object.entries(env).forEach(([key, value]) => {
    if (!value) return;
    process.env[key] = value;
  });
}
