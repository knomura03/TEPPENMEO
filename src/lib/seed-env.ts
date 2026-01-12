export type EnvIssue = "missing" | "invalid";

const envGuidance: Record<
  string,
  { location: string; nextAction: string }
> = {
  NEXT_PUBLIC_SUPABASE_URL: {
    location: "Supabaseダッシュボード → Project Settings → API",
    nextAction: "URLをコピーして入力してください。",
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    location: "Supabaseダッシュボード → Project Settings → API（service_role key）",
    nextAction: "service_role key を入力してください。",
  },
  SYSTEM_ADMIN_EMAIL: {
    location: "任意の管理者メールアドレス",
    nextAction: "管理者として使うメールを入力してください。",
  },
  SYSTEM_ADMIN_PASSWORD: {
    location: "任意（8文字以上）",
    nextAction: "8文字以上で設定するか未設定にしてください。",
  },
};

export function formatSeedEnvErrors(issues: Record<string, EnvIssue>) {
  const lines: string[] = [];
  lines.push("シードに必要な環境変数が不足または形式エラーです。");
  lines.push("");
  lines.push("不足/不正な項目:");
  Object.entries(issues).forEach(([key, reason]) => {
    const guidance = envGuidance[key] ?? {
      location: "不明",
      nextAction: ".env.local を確認してください。",
    };
    const label = reason === "missing" ? "未設定" : "形式不正";
    lines.push(
      `- ${key}（${label}）取得場所: ${guidance.location} / 次にやること: ${guidance.nextAction}`
    );
  });
  lines.push("");
  lines.push("次にやること:");
  lines.push("1) cp .env.example .env.local");
  lines.push("2) 不足/不正な項目を入力");
  lines.push("3) pnpm seed");
  return lines.join("\n");
}
