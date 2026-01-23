export type PreflightMode = "mock" | "real";
export type PreflightEnvContext = "local" | "staging" | "prod";

type ValidationResult = { ok: boolean; reason: string | null };

export function parsePreflightMode(
  args: string[],
  fallback: PreflightMode
): PreflightMode {
  const arg = args.find((item) => item.startsWith("--mode="));
  if (!arg) return fallback;
  const value = arg.replace("--mode=", "");
  return value === "mock" ? "mock" : "real";
}

export function parsePreflightEnv(
  args: string[],
  fallback: PreflightEnvContext
): PreflightEnvContext {
  const arg = args.find((item) => item.startsWith("--env="));
  if (!arg) return fallback;
  const value = arg.replace("--env=", "");
  if (value === "staging" || value === "prod" || value === "local") {
    return value;
  }
  return fallback;
}

export function validateAppBaseUrlForEnv(
  value: string | undefined,
  envContext: PreflightEnvContext
): ValidationResult {
  if (!value) {
    return { ok: false, reason: "APP_BASE_URL 未設定: staging/prod では必須です。" };
  }
  if (envContext === "local") {
    return { ok: true, reason: null };
  }
  if (!value.startsWith("https://")) {
    return {
      ok: false,
      reason: "APP_BASE_URL は https:// で始まる必要があります（staging/prod）。",
    };
  }
  if (value.includes("localhost") || value.includes("127.0.0.1")) {
    return {
      ok: false,
      reason: "APP_BASE_URL に localhost は使えません（staging/prod）。",
    };
  }
  return { ok: true, reason: null };
}
