import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getSessionUser } from "@/server/auth/session";
import { ProviderType } from "@/server/providers/types";
import { getEnvChecks, checkSupabaseConnection } from "@/server/services/diagnostics";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { listProviderConnections } from "@/server/services/provider-connections";

const connectionLabels = {
  connected: "接続済み",
  not_connected: "未接続",
  reauth_required: "再認可が必要",
} as const;

export default async function AdminDiagnosticsPage() {
  const { checks, envError, providerMockMode } = getEnvChecks();
  const supabase = await checkSupabaseConnection();

  const user = await getSessionUser();
  const org = user ? await getPrimaryOrganization(user.id) : null;
  const connections = org ? await listProviderConnections(org.id, user?.id) : [];
  const googleConnection = connections.find(
    (item) => item.provider === ProviderType.GoogleBusinessProfile
  );
  const metaConnection = connections.find(
    (item) => item.provider === ProviderType.Meta
  );

  const googleStatus = org
    ? googleConnection?.status ?? "not_connected"
    : "unknown";
  const metaStatus = org ? metaConnection?.status ?? "not_connected" : "unknown";

  const googleStatusLabel =
    googleStatus === "unknown"
      ? "未判定"
      : connectionLabels[googleStatus];
  const metaStatusLabel =
    metaStatus === "unknown" ? "未判定" : connectionLabels[metaStatus];

  const metaEnvOk = Boolean(
    process.env.META_APP_ID &&
      process.env.META_APP_SECRET &&
      process.env.META_REDIRECT_URI
  );

  const nextSteps: string[] = [];
  if (envError) {
    nextSteps.push("環境変数の形式エラーを修正してください。");
  }
  if (checks.some((check) => !check.present)) {
    nextSteps.push("未設定の必須環境変数を設定してください。");
  }
  if (!supabase.ok) {
    nextSteps.push("SupabaseのURLとキーを再確認してください。");
  }
  if (providerMockMode) {
    nextSteps.push("実接続する場合はPROVIDER_MOCK_MODEをfalseにしてください。");
  }
  if (!org) {
    nextSteps.push("所属組織が未設定です。シードまたはメンバー追加を確認してください。");
  }
  if (org && googleStatus === "reauth_required") {
    nextSteps.push("Googleの再認可を実行してください。");
  }
  if (org && googleStatus === "not_connected") {
    nextSteps.push("ロケーション詳細でGoogle接続を開始してください。");
  }
  if (org && metaStatus === "reauth_required") {
    nextSteps.push("Metaの再認可を実行してください。");
  }
  if (org && metaStatus === "not_connected") {
    nextSteps.push("ロケーション詳細でMeta接続を開始してください。");
  }
  if (!metaEnvOk) {
    nextSteps.push("Metaの環境変数を設定してください。");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">診断</h1>
        <p className="text-sm text-slate-300">
          実画面テストに必要な設定を簡易チェックします。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-700 bg-slate-900 text-slate-100">
          <CardHeader>
            <p className="text-sm font-semibold">必須環境変数</p>
            <p className="text-xs text-slate-400">
              値は表示しません（設定済み/未設定のみ）。
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {checks.map((check) => (
              <div
                key={check.key}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-slate-300">{check.key}</span>
                <Badge variant={check.present ? "success" : "warning"}>
                  {check.present ? "設定済み" : "未設定"}
                </Badge>
              </div>
            ))}
            {envError && (
              <p className="pt-2 text-xs text-amber-300">{envError}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900 text-slate-100">
          <CardHeader>
            <p className="text-sm font-semibold">Supabase接続</p>
            <p className="text-xs text-slate-400">簡易接続テストの結果です。</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">接続状態</span>
              <Badge variant={supabase.ok ? "success" : "warning"}>
                {supabase.ok ? "正常" : "異常"}
              </Badge>
            </div>
            {supabase.message && (
              <p className="text-xs text-amber-300">{supabase.message}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900 text-slate-100">
          <CardHeader>
            <p className="text-sm font-semibold">プロバイダ状態</p>
            <p className="text-xs text-slate-400">
              実接続と再認可の状態を確認します。
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">モックモード</span>
              <Badge variant={providerMockMode ? "warning" : "success"}>
                {providerMockMode ? "有効" : "無効"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Google接続</span>
              <Badge
                variant={
                  googleStatus === "connected" ? "success" : "warning"
                }
              >
                {googleStatusLabel}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Meta接続</span>
              <Badge
                variant={metaStatus === "connected" ? "success" : "warning"}
              >
                {metaStatusLabel}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Meta環境変数</span>
              <Badge variant={metaEnvOk ? "success" : "warning"}>
                {metaEnvOk ? "設定済み" : "未設定"}
              </Badge>
            </div>
            {googleConnection?.message && (
              <p className="text-xs text-amber-300">
                {googleConnection.message}
              </p>
            )}
            {metaConnection?.message && (
              <p className="text-xs text-amber-300">
                {metaConnection.message}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              対象組織: {org?.name ?? "未設定"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900 text-slate-100">
          <CardHeader>
            <p className="text-sm font-semibold">次にやること</p>
            <p className="text-xs text-slate-400">
              未完了の項目がある場合に確認してください。
            </p>
          </CardHeader>
          <CardContent>
            {nextSteps.length === 0 ? (
              <p className="text-xs text-emerald-300">
                主要な準備は完了しています。
              </p>
            ) : (
              <ul className="list-disc space-y-2 pl-4 text-xs text-slate-300">
                {nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
