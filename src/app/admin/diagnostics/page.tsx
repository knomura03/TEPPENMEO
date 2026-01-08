import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getSessionUser } from "@/server/auth/session";
import { ProviderType } from "@/server/providers/types";
import {
  checkAuditLogsIndexes,
  checkSupabaseConnection,
  checkUserBlocksSchema,
  getEnvChecks,
} from "@/server/services/diagnostics";
import { getMediaConfig, isStorageConfigured } from "@/server/services/media";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { getProviderAccount } from "@/server/services/provider-accounts";
import { listProviderConnections } from "@/server/services/provider-connections";

const connectionLabels = {
  connected: "接続済み",
  not_connected: "未接続",
  reauth_required: "再認可が必要",
} as const;

const googleRequiredScopes = ["https://www.googleapis.com/auth/business.manage"];
const metaRequiredPermissions = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
];

function normalizeGoogleScope(scope: string) {
  return scope.replace("https://www.googleapis.com/auth/", "");
}

function resolveScopeStatus(params: {
  storedScopes: string[];
  requiredScopes: string[];
  normalize?: (scope: string) => string;
}): "ok" | "missing" | "unknown" {
  if (!params.storedScopes.length) return "unknown";
  const normalize = params.normalize ?? ((value: string) => value);
  const hasAll = params.requiredScopes.every((required) =>
    params.storedScopes.some(
      (scope) => normalize(scope) === normalize(required)
    )
  );
  return hasAll ? "ok" : "missing";
}

export default async function AdminDiagnosticsPage() {
  const { checks, envError, providerMockMode } = getEnvChecks();
  const supabase = await checkSupabaseConnection();
  const userBlocksSchema = await checkUserBlocksSchema();
  const auditLogsIndexes = await checkAuditLogsIndexes();
  const mediaConfig = getMediaConfig();
  const storageReady = isStorageConfigured();

  const user = await getSessionUser();
  const org = user ? await getPrimaryOrganization(user.id) : null;
  const connections = org ? await listProviderConnections(org.id, user?.id) : [];
  const googleAccount = org
    ? await getProviderAccount(org.id, ProviderType.GoogleBusinessProfile)
    : null;
  const metaAccount = org ? await getProviderAccount(org.id, ProviderType.Meta) : null;
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

  const googleStoredScopes = googleAccount?.scopes ?? [];
  const metaStoredScopes = metaAccount?.scopes ?? [];
  const googleScopeStatus = resolveScopeStatus({
    storedScopes: googleStoredScopes,
    requiredScopes: googleRequiredScopes,
    normalize: normalizeGoogleScope,
  });
  const metaScopeStatus = resolveScopeStatus({
    storedScopes: metaStoredScopes,
    requiredScopes: metaRequiredPermissions,
  });

  const googleScopeLabel =
    googleStoredScopes.length > 0
      ? googleStoredScopes.join(", ")
      : "保存していないため不明";
  const metaScopeLabel =
    metaStoredScopes.length > 0
      ? metaStoredScopes.join(", ")
      : "保存していないため不明";

  const googleApiAccessFlag = googleAccount?.metadata?.api_access;
  const googleApiAccessStatus =
    googleApiAccessFlag === false
      ? "未承認の可能性が高い"
      : googleApiAccessFlag === true
        ? "承認済み（推定）"
        : "不明";

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
  if (org && googleScopeStatus === "missing") {
    nextSteps.push(
      "Googleのbusiness.manageスコープが不足している可能性が高いです。スコープ設定を確認して再接続してください。"
    );
  }
  if (org && googleScopeStatus === "unknown") {
    nextSteps.push(
      "Googleスコープの取得状況が不明です。取得状況は保存していないため、接続時のスコープ設定を確認してください。"
    );
  }
  if (org && googleApiAccessFlag === false) {
    nextSteps.push(
      "Google Business ProfileのAPI承認が未完了の可能性が高いです。承認後に再接続してください。"
    );
  }
  if (org && metaStatus === "reauth_required") {
    nextSteps.push("Metaの再認可を実行してください。");
  }
  if (org && metaStatus === "not_connected") {
    nextSteps.push("ロケーション詳細でMeta接続を開始してください。");
  }
  if (org && metaScopeStatus === "missing") {
    nextSteps.push(
      "Metaの権限が不足している可能性が高いです。App Reviewと権限を確認して再接続してください。"
    );
  }
  if (org && metaScopeStatus === "unknown") {
    nextSteps.push(
      "Metaの権限取得状況が不明です。取得状況は保存していないため、App Reviewや権限設定を確認してください。"
    );
  }
  if (!metaEnvOk) {
    nextSteps.push("Metaの環境変数を設定してください。");
  }
  if (!mediaConfig.bucket) {
    nextSteps.push("Supabase Storageのバケットを作成してください。");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    nextSteps.push("SUPABASE_SERVICE_ROLE_KEY を設定してください。");
  }
  if (userBlocksSchema.status === "missing") {
    nextSteps.push(
      "user_blocks マイグレーションを適用してください（無効化機能に必要）。"
    );
  }
  if (userBlocksSchema.status === "unknown") {
    nextSteps.push("user_blocks の確認に失敗しました。設定を確認してください。");
  }
  if (auditLogsIndexes.status === "missing") {
    nextSteps.push(
      "監査ログのインデックスマイグレーションを適用してください（検索性能に影響します）。"
    );
  }
  if (auditLogsIndexes.status === "unknown") {
    nextSteps.push(
      "監査ログインデックスの確認に失敗しました。設定を確認してください。"
    );
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
        <Card tone="dark">
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

        <Card tone="dark">
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

        <Card tone="dark">
          <CardHeader>
            <p className="text-sm font-semibold">マイグレーション</p>
            <p className="text-xs text-slate-400">
              user_blocks と監査ログインデックスの適用状況を確認します。
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">user_blocks</span>
              <Badge
                variant={userBlocksSchema.status === "ok" ? "success" : "warning"}
              >
                {userBlocksSchema.status === "ok"
                  ? "適用済み"
                  : userBlocksSchema.status === "missing"
                    ? "未適用"
                    : "未判定"}
              </Badge>
            </div>
            {userBlocksSchema.message && (
              <p className="text-xs text-amber-300">
                {userBlocksSchema.message}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">
                audit_logs インデックス
              </span>
              <Badge
                variant={
                  auditLogsIndexes.status === "ok" ? "success" : "warning"
                }
              >
                {auditLogsIndexes.status === "ok"
                  ? "適用済み"
                  : auditLogsIndexes.status === "missing"
                    ? "未適用"
                    : "未判定"}
              </Badge>
            </div>
            {auditLogsIndexes.message && (
              <p className="text-xs text-amber-300">
                {auditLogsIndexes.message}
              </p>
            )}
            {userBlocksSchema.status !== "ok" && (
              <a
                href="/docs/runbooks/supabase-migrations"
                className="inline-flex text-xs text-amber-200 underline"
              >
                適用手順を確認する
              </a>
            )}
            {userBlocksSchema.status === "ok" &&
              auditLogsIndexes.status !== "ok" && (
                <a
                  href="/docs/runbooks/supabase-migrations"
                  className="inline-flex text-xs text-amber-200 underline"
                >
                  適用手順を確認する
                </a>
              )}
          </CardContent>
        </Card>

        <Card tone="dark">
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
            <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3 text-[11px] text-slate-300">
              <p className="font-semibold text-slate-200">Google 権限/スコープ</p>
              <p className="mt-1">
                必須: {googleRequiredScopes.join(", ")}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span>取得状況</span>
                <Badge
                  variant={
                    googleScopeStatus === "ok"
                      ? "success"
                      : googleScopeStatus === "missing"
                        ? "warning"
                        : "muted"
                  }
                >
                  {googleScopeStatus === "ok"
                    ? "取得済み"
                    : googleScopeStatus === "missing"
                      ? "不足の可能性"
                      : "不明"}
                </Badge>
              </div>
              <p className="mt-1 text-slate-400">取得済み: {googleScopeLabel}</p>
              <p className="mt-1 text-slate-400">
                API承認: {googleApiAccessStatus}
              </p>
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3 text-[11px] text-slate-300">
              <p className="font-semibold text-slate-200">Meta 権限</p>
              <p className="mt-1">
                必須: {metaRequiredPermissions.join(", ")}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span>取得状況</span>
                <Badge
                  variant={
                    metaScopeStatus === "ok"
                      ? "success"
                      : metaScopeStatus === "missing"
                        ? "warning"
                        : "muted"
                  }
                >
                  {metaScopeStatus === "ok"
                    ? "取得済み"
                    : metaScopeStatus === "missing"
                      ? "不足の可能性"
                      : "不明"}
                </Badge>
              </div>
              <p className="mt-1 text-slate-400">取得済み: {metaScopeLabel}</p>
              <p className="mt-1 text-slate-400">
                取得状況が不明な場合はApp Reviewと権限設定を確認してください（推定）。
              </p>
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
            <a
              href="/admin/provider-health"
              className="text-[11px] text-amber-200 underline"
            >
              実機ヘルスチェックを開く
            </a>
            <p className="text-[11px] text-slate-400">
              対象組織: {org?.name ?? "未設定"}
            </p>
          </CardContent>
        </Card>

        <Card tone="dark">
          <CardHeader>
            <p className="text-sm font-semibold">画像アップロード</p>
            <p className="text-xs text-slate-400">
              Supabase Storageの設定状況を確認します。
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">バケット</span>
              <Badge variant={mediaConfig.bucket ? "success" : "warning"}>
                {mediaConfig.bucket ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">サービスキー</span>
              <Badge
                variant={
                  process.env.SUPABASE_SERVICE_ROLE_KEY ? "success" : "warning"
                }
              >
                {process.env.SUPABASE_SERVICE_ROLE_KEY ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">署名URL期限</span>
              <Badge variant="muted">
                {mediaConfig.signedUrlTtlSeconds}秒
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">最大アップロード</span>
              <Badge variant="muted">{mediaConfig.maxUploadMb}MB</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">利用可否</span>
              <Badge variant={storageReady ? "success" : "warning"}>
                {storageReady ? "利用可能" : "未準備"}
              </Badge>
            </div>
            {providerMockMode && (
              <p className="text-xs text-amber-300">
                モックモードではStorage未設定でもアップロードできます。
              </p>
            )}
          </CardContent>
        </Card>

        <Card tone="dark">
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
