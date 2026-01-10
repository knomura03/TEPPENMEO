import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/Callout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { adminActionSecondaryClass } from "@/components/ui/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSessionUser } from "@/server/auth/session";
import { ProviderType } from "@/server/providers/types";
import {
  checkAuditLogsIndexes,
  checkJobRunsRunningIndex,
  checkMediaAssetsSchema,
  checkJobSchedulesSchema,
  checkJobRunsSchema,
  checkSupabaseConnection,
  checkSetupProgressSchema,
  checkUserBlocksSchema,
  getEnvCheckGroups,
} from "@/server/services/diagnostics";
import { countEnabledJobSchedules } from "@/server/services/jobs/job-schedules";
import { getMediaConfig, isStorageConfigured } from "@/server/services/media";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { getProviderAccount } from "@/server/services/provider-accounts";
import { listProviderConnections } from "@/server/services/provider-connections";
import { resolvePermissionDiff } from "@/server/services/provider-permissions";
import { EnvSnippet } from "./EnvSnippet";

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

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return value.split(/[\s,]+/).filter(Boolean);
  }
  return [];
}

export default async function AdminDiagnosticsPage() {
  const { mockRequired, realRequired, envError, providerMockMode } =
    getEnvCheckGroups();
  const supabase = await checkSupabaseConnection();
  const userBlocksSchema = await checkUserBlocksSchema();
  const setupProgressSchema = await checkSetupProgressSchema();
  const mediaAssetsSchema = await checkMediaAssetsSchema();
  const jobRunsSchema = await checkJobRunsSchema();
  const jobSchedulesSchema = await checkJobSchedulesSchema();
  const jobRunsRunningIndex = await checkJobRunsRunningIndex();
  const auditLogsIndexes = await checkAuditLogsIndexes();
  const mediaConfig = getMediaConfig();
  const storageReady = isStorageConfigured();
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET);

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
  const googleRequestedScopes = normalizeStringArray(
    googleAccount?.metadata?.requested_scopes
  );
  const metaGrantedScopes = normalizeStringArray(
    metaAccount?.metadata?.permissions_granted
  );
  const metaStoredScopes =
    metaGrantedScopes.length > 0 ? metaGrantedScopes : metaAccount?.scopes ?? [];
  const metaRequestedScopes = normalizeStringArray(
    metaAccount?.metadata?.requested_permissions
  );
  const metaDeclinedScopes = normalizeStringArray(
    metaAccount?.metadata?.permissions_declined
  );
  const googlePermissionDiff = resolvePermissionDiff({
    required: googleRequiredScopes,
    requested: googleRequestedScopes,
    granted: googleStoredScopes,
    normalize: normalizeGoogleScope,
  });
  const metaPermissionDiff = resolvePermissionDiff({
    required: metaRequiredPermissions,
    requested: metaRequestedScopes,
    granted: metaStoredScopes,
  });

  const googleScopeLabel =
    googlePermissionDiff.granted.length > 0
      ? googlePermissionDiff.granted.join(", ")
      : "保存していないため不明";
  const googleRequestedLabel =
    googlePermissionDiff.requested.length > 0
      ? googlePermissionDiff.requested.join(", ")
      : "保存していないため不明";
  const metaScopeLabel =
    metaPermissionDiff.granted.length > 0
      ? metaPermissionDiff.granted.join(", ")
      : "保存していないため不明";
  const metaRequestedLabel =
    metaPermissionDiff.requested.length > 0
      ? metaPermissionDiff.requested.join(", ")
      : "保存していないため不明";
  const metaDeclinedLabel =
    metaDeclinedScopes.length > 0
      ? metaDeclinedScopes.join(", ")
      : null;
  const googlePermissionNotice =
    googlePermissionDiff.state === "missing"
      ? {
          cause: `必須スコープが不足しています: ${googlePermissionDiff.missing.join(
            ", "
          )}`,
          actions: [
            "再認可でスコープを付与してください。",
            "Google CloudのOAuth同意画面設定を確認してください。",
          ],
        }
      : googlePermissionDiff.state === "requested"
        ? {
            cause: "スコープは要求済みですが付与状況が不明です。",
            actions: ["再認可して付与状況を確認してください。"],
          }
        : googlePermissionDiff.state === "unknown"
          ? {
              cause: "スコープ取得状況を保存していません。",
              actions: ["再認可時にスコープ保存を確認してください。"],
            }
          : null;
  const metaPermissionNotice =
    metaPermissionDiff.state === "missing"
      ? {
          cause: `必須権限が不足しています: ${metaPermissionDiff.missing.join(", ")}`,
          actions: [
            "再認可で権限を付与してください。",
            "App Reviewとページ権限の設定を確認してください。",
          ],
        }
      : metaPermissionDiff.state === "requested"
        ? {
            cause: "権限は要求済みですが付与状況が不明です。",
            actions: ["再認可またはApp Reviewの状況を確認してください。"],
          }
        : metaPermissionDiff.state === "unknown"
          ? {
              cause: "権限取得状況を保存していません。",
              actions: ["再認可時に権限保存を確認してください。"],
            }
          : null;

  const googleApiAccessFlag = googleAccount?.metadata?.api_access;
  const googleApiAccessStatus =
    googleApiAccessFlag === false
      ? "未承認の可能性が高い"
      : googleApiAccessFlag === true
        ? "承認済み（推定）"
        : "不明";

  const missingMockEnv = mockRequired.filter((check) => !check.present);
  const missingRealEnv = realRequired.filter((check) => !check.present);
  const externalApiEnabled = !providerMockMode;
  const autoSyncCount = await countEnabledJobSchedules({
    jobKey: "gbp_reviews_bulk_sync",
  });

  const nextSteps: string[] = [];
  if (envError) {
    nextSteps.push("環境変数の形式エラーを修正してください。");
  }
  if (missingMockEnv.length > 0) {
    nextSteps.push(
      `モック運用でも必須の環境変数が未設定です: ${missingMockEnv
        .map((check) => check.key)
        .join(", ")}`
    );
  }
  if (missingRealEnv.length > 0) {
    nextSteps.push(
      providerMockMode
        ? `実機運用に切り替える場合は次の環境変数を設定してください: ${missingRealEnv
            .map((check) => check.key)
            .join(", ")}`
        : `実機運用に必要な環境変数が未設定です: ${missingRealEnv
            .map((check) => check.key)
            .join(", ")}`
    );
  }
  if (!supabase.ok) {
    nextSteps.push("SupabaseのURLとキーを再確認してください。");
  }
  if (providerMockMode) {
    nextSteps.push(
      "実接続する場合はPROVIDER_MOCK_MODEをfalseにしてください。"
    );
    nextSteps.push("実機運用への切り替え手順書を確認してください。");
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
  if (org && googlePermissionDiff.state === "missing") {
    nextSteps.push(
      `Googleで不足しているスコープ: ${googlePermissionDiff.missing.join(", ")}`
    );
  }
  if (org && googlePermissionDiff.state === "requested") {
    nextSteps.push(
      "Googleのスコープ取得は要求済みです。付与状況は不明なため、再認可または設定確認を行ってください。"
    );
  }
  if (org && googlePermissionDiff.state === "unknown") {
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
  if (org && metaPermissionDiff.state === "missing") {
    nextSteps.push(
      `Metaで不足している権限: ${metaPermissionDiff.missing.join(", ")}`
    );
  }
  if (org && metaPermissionDiff.state === "requested") {
    nextSteps.push(
      "Meta権限の要求は記録済みです。App Reviewと権限承認の状況を確認してください（推定）。"
    );
  }
  if (org && metaPermissionDiff.state === "unknown") {
    nextSteps.push(
      "Metaの権限取得状況が不明です。取得状況は保存していないため、App Reviewや権限設定を確認してください。"
    );
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
  if (setupProgressSchema.status === "missing") {
    nextSteps.push(
      "setup_progress マイグレーションを適用してください（セットアップ進捗に必要）。"
    );
  }
  if (setupProgressSchema.status === "unknown") {
    nextSteps.push(
      "setup_progress の確認に失敗しました。設定を確認してください。"
    );
  }
  if (mediaAssetsSchema.status === "missing") {
    nextSteps.push(
      "media_assets マイグレーションを適用してください（アップロード集計に必要）。"
    );
  }
  if (mediaAssetsSchema.status === "unknown") {
    nextSteps.push(
      "media_assets の確認に失敗しました。設定を確認してください。"
    );
  }
  if (jobRunsSchema.status === "missing") {
    nextSteps.push(
      "job_runs マイグレーションを適用してください（ジョブ履歴に必要）。"
    );
  }
  if (jobSchedulesSchema.status === "missing") {
    nextSteps.push(
      "job_schedules マイグレーションを適用してください（自動同期に必要）。"
    );
  }
  if (jobRunsRunningIndex.status === "missing") {
    nextSteps.push(
      "job_runs の重複防止インデックスを適用してください（同時実行の防止）。"
    );
  }
  if (jobRunsSchema.status === "unknown") {
    nextSteps.push(
      "job_runs の確認に失敗しました。設定を確認してください。"
    );
  }
  if (jobSchedulesSchema.status === "unknown") {
    nextSteps.push(
      "job_schedules の確認に失敗しました。設定を確認してください。"
    );
  }
  if (jobRunsRunningIndex.status === "unknown") {
    nextSteps.push(
      "job_runs の重複防止インデックス確認に失敗しました。設定を確認してください。"
    );
  }
  if (autoSyncCount.count && !cronSecretConfigured) {
    nextSteps.push("自動同期が有効なため CRON_SECRET を設定してください。");
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

  const migrationChecks = [
    { label: "user_blocks", schema: userBlocksSchema },
    { label: "setup_progress", schema: setupProgressSchema },
    { label: "media_assets", schema: mediaAssetsSchema },
    { label: "job_runs", schema: jobRunsSchema },
    { label: "job_schedules", schema: jobSchedulesSchema },
    { label: "job_runs 重複防止", schema: jobRunsRunningIndex },
    { label: "audit_logs インデックス", schema: auditLogsIndexes },
  ];
  const migrationAlerts = migrationChecks
    .filter((item) => item.schema.status !== "ok")
    .map((item) =>
      item.schema.status === "missing"
        ? `${item.label} が未適用です。`
        : `${item.label} の確認に失敗しました。`
    );
  const migrationNotes = migrationChecks
    .map((item) => item.schema.message)
    .filter((message): message is string => Boolean(message));

  return (
    <div className="space-y-8">
      <PageHeader
        title="診断"
        description="実画面テストに必要な設定を簡易チェックします。"
        tone="dark"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <p className="text-base font-semibold text-slate-100">環境変数</p>
            <p className="text-sm text-slate-300">
              モード別に必須項目を整理します。値は表示しません。
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span className="font-semibold">モック運用でも必須</span>
                <Badge
                  variant={
                    missingMockEnv.length === 0 ? "success" : "warning"
                  }
                >
                  {missingMockEnv.length === 0 ? "設定済み" : "未設定あり"}
                </Badge>
              </div>
              {mockRequired.map((check) => (
                <div
                  key={check.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-slate-300">{check.key}</span>
                  <Badge variant={check.present ? "success" : "warning"}>
                    {check.present ? "設定済み" : "未設定"}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span className="font-semibold">実機運用で必須</span>
                <Badge
                  variant={
                    missingRealEnv.length === 0
                      ? "success"
                      : providerMockMode
                        ? "muted"
                        : "warning"
                  }
                >
                  {missingRealEnv.length === 0
                    ? "設定済み"
                    : providerMockMode
                      ? "未設定（モック中は不要）"
                      : "未設定"}
                </Badge>
              </div>
              {realRequired.map((check) => (
                <div
                  key={check.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-slate-300">{check.key}</span>
                  <Badge
                    variant={
                      check.present
                        ? "success"
                        : providerMockMode
                          ? "muted"
                          : "warning"
                    }
                  >
                    {check.present
                      ? "設定済み"
                      : providerMockMode
                        ? "未設定（モック中は不要）"
                        : "未設定"}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span className="font-semibold">CRON_SECRET</span>
              <Badge variant={cronSecretConfigured ? "success" : "warning"}>
                {cronSecretConfigured ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <p className="text-sm text-slate-400">
                空の .env.local スニペット
              </p>
              <EnvSnippet
                value={[
                  "# モック運用でも必須",
                  ...mockRequired.map((check) => `${check.key}=`),
                  "",
                  "# 実機運用で必須",
                  ...realRequired.map((check) => `${check.key}=`),
                  "",
                  "# 自動同期（Cron）",
                  "CRON_SECRET=",
                ].join("\n")}
              />
            </div>
            {(envError ||
              missingMockEnv.length > 0 ||
              missingRealEnv.length > 0) && (
              <Callout title="次にやること" tone="warning">
                {envError && <p>原因: {envError}</p>}
                {missingMockEnv.length > 0 && (
                  <p>
                    モック運用でも必須: {missingMockEnv.map((check) => check.key).join(", ")}
                  </p>
                )}
                {missingRealEnv.length > 0 && (
                  <p>
                    {providerMockMode
                      ? "実機運用に切り替える場合は次を設定してください: "
                      : "実機運用で必須: "}
                    {missingRealEnv.map((check) => check.key).join(", ")}
                  </p>
                )}
                <div>
                  <a
                    href="/docs/runbooks/switch-mock-to-real"
                    className={adminActionSecondaryClass}
                  >
                    モック→実機の切り替え手順
                  </a>
                </div>
              </Callout>
            )}
          </CardContent>
        </Card>

        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <p className="text-base font-semibold text-slate-100">自動同期（GBP）</p>
            <p className="text-sm text-slate-300">
              Cron設定と自動同期の有効数を確認します。
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>CRON_SECRET</span>
              <Badge variant={cronSecretConfigured ? "success" : "warning"}>
                {cronSecretConfigured ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>自動同期ON</span>
              <Badge
                variant={autoSyncCount.count === null ? "muted" : "success"}
              >
                {autoSyncCount.count === null
                  ? "未判定"
                  : `${autoSyncCount.count}件`}
              </Badge>
            </div>
            {autoSyncCount.reason && (
              <Callout title="原因" tone="warning">
                <p>{autoSyncCount.reason}</p>
                <p>次にやること: 手順書に沿って設定を確認してください。</p>
                <div>
                  <a
                    href="/docs/runbooks/gbp-bulk-review-sync"
                    className={adminActionSecondaryClass}
                  >
                    自動同期の手順書を確認する
                  </a>
                </div>
              </Callout>
            )}
            {!autoSyncCount.reason && (
              <a
                href="/docs/runbooks/gbp-bulk-review-sync"
                className={adminActionSecondaryClass}
              >
                自動同期の手順書を確認する
              </a>
            )}
          </CardContent>
        </Card>

        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <p className="text-base font-semibold text-slate-100">Supabase接続</p>
            <p className="text-sm text-slate-300">簡易接続テストの結果です。</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>接続状態</span>
              <Badge variant={supabase.ok ? "success" : "warning"}>
                {supabase.ok ? "正常" : "異常"}
              </Badge>
            </div>
            {!supabase.ok && supabase.message && (
              <Callout title="原因" tone="warning">
                <p>{supabase.message}</p>
                <p>次にやること: SUPABASE_URL と SUPABASE_ANON_KEY を確認してください。</p>
              </Callout>
            )}
          </CardContent>
        </Card>

        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <p className="text-base font-semibold text-slate-100">マイグレーション</p>
            <p className="text-sm text-slate-300">
              user_blocks とジョブ系テーブル、監査ログインデックスの適用状況を確認します。
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>user_blocks</span>
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
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>setup_progress</span>
              <Badge
                variant={
                  setupProgressSchema.status === "ok" ? "success" : "warning"
                }
              >
                {setupProgressSchema.status === "ok"
                  ? "適用済み"
                  : setupProgressSchema.status === "missing"
                    ? "未適用"
                    : "未判定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>media_assets</span>
              <Badge
                variant={
                  mediaAssetsSchema.status === "ok" ? "success" : "warning"
                }
              >
                {mediaAssetsSchema.status === "ok"
                  ? "適用済み"
                  : mediaAssetsSchema.status === "missing"
                    ? "未適用"
                    : "未判定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>job_runs</span>
              <Badge
                variant={jobRunsSchema.status === "ok" ? "success" : "warning"}
              >
                {jobRunsSchema.status === "ok"
                  ? "適用済み"
                  : jobRunsSchema.status === "missing"
                    ? "未適用"
                    : "未判定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>job_schedules</span>
              <Badge
                variant={
                  jobSchedulesSchema.status === "ok" ? "success" : "warning"
                }
              >
                {jobSchedulesSchema.status === "ok"
                  ? "適用済み"
                  : jobSchedulesSchema.status === "missing"
                    ? "未適用"
                    : "未判定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>job_runs 重複防止</span>
              <Badge
                variant={
                  jobRunsRunningIndex.status === "ok" ? "success" : "warning"
                }
              >
                {jobRunsRunningIndex.status === "ok"
                  ? "適用済み"
                  : jobRunsRunningIndex.status === "missing"
                    ? "未適用"
                    : "未判定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>audit_logs インデックス</span>
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
            {(migrationAlerts.length > 0 || migrationNotes.length > 0) && (
              <Callout title="次にやること" tone="warning">
                <p>原因: マイグレーション未適用または未判定の項目があります。</p>
                <p>次にやること: 該当マイグレーションを適用してください。</p>
                {migrationAlerts.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {migrationAlerts.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {migrationNotes.length > 0 && (
                  <div className="space-y-1">
                    {migrationNotes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                )}
                <div>
                  <a
                    href="/docs/runbooks/supabase-migrations"
                    className={adminActionSecondaryClass}
                  >
                    適用手順を確認する
                  </a>
                </div>
              </Callout>
            )}
          </CardContent>
        </Card>

        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <p className="text-base font-semibold text-slate-100">プロバイダ状態</p>
            <p className="text-sm text-slate-300">
              実接続と再認可の状態を確認します。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>モックモード</span>
              <Badge variant={providerMockMode ? "warning" : "success"}>
                {providerMockMode ? "ON" : "OFF"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>外部API呼び出し</span>
              <Badge variant={externalApiEnabled ? "success" : "warning"}>
                {externalApiEnabled ? "有効" : "無効"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Google接続</span>
              <Badge
                variant={googleStatus === "connected" ? "success" : "warning"}
              >
                {googleStatusLabel}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Meta接続</span>
              <Badge variant={metaStatus === "connected" ? "success" : "warning"}>
                {metaStatusLabel}
              </Badge>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
              <p className="text-base font-semibold text-slate-100">Google 権限/スコープ</p>
              <p className="mt-1">必須: {googlePermissionDiff.required.join(", ")}</p>
              <div className="mt-2 flex items-center justify-between">
                <span>取得状況</span>
                <Badge
                  variant={
                    googlePermissionDiff.state === "ok"
                      ? "success"
                      : googlePermissionDiff.state === "missing"
                        ? "warning"
                        : googlePermissionDiff.state === "requested"
                          ? "warning"
                          : "muted"
                  }
                >
                  {googlePermissionDiff.state === "ok"
                    ? "取得済み"
                    : googlePermissionDiff.state === "missing"
                      ? "不足の可能性"
                      : googlePermissionDiff.state === "requested"
                        ? "要求済み"
                        : "不明"}
                </Badge>
              </div>
              <p className="mt-1 text-slate-400">取得済み: {googleScopeLabel}</p>
              <p className="mt-1 text-slate-400">要求済み: {googleRequestedLabel}</p>
              <p className="mt-1 text-slate-400">
                不足:{" "}
                {googlePermissionDiff.state === "missing"
                  ? googlePermissionDiff.missing.join(", ")
                  : googlePermissionDiff.state === "ok"
                    ? "不足なし"
                    : googlePermissionDiff.state === "requested"
                      ? "未判定（要求済みのみ）"
                      : "判定不可"}
              </p>
              <p className="mt-1 text-slate-400">API承認: {googleApiAccessStatus}</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
              <p className="text-base font-semibold text-slate-100">Meta 権限</p>
              <p className="mt-1">必須: {metaPermissionDiff.required.join(", ")}</p>
              <div className="mt-2 flex items-center justify-between">
                <span>取得状況</span>
                <Badge
                  variant={
                    metaPermissionDiff.state === "ok"
                      ? "success"
                      : metaPermissionDiff.state === "missing"
                        ? "warning"
                        : metaPermissionDiff.state === "requested"
                          ? "warning"
                          : "muted"
                  }
                >
                  {metaPermissionDiff.state === "ok"
                    ? "取得済み"
                    : metaPermissionDiff.state === "missing"
                      ? "不足の可能性"
                      : metaPermissionDiff.state === "requested"
                        ? "要求済み"
                        : "不明"}
                </Badge>
              </div>
              <p className="mt-1 text-slate-400">取得済み: {metaScopeLabel}</p>
              <p className="mt-1 text-slate-400">要求済み: {metaRequestedLabel}</p>
              <p className="mt-1 text-slate-400">
                不足:{" "}
                {metaPermissionDiff.state === "missing"
                  ? metaPermissionDiff.missing.join(", ")
                  : metaPermissionDiff.state === "ok"
                    ? "不足なし"
                    : metaPermissionDiff.state === "requested"
                      ? "未判定（要求済みのみ）"
                      : "判定不可"}
              </p>
              {metaDeclinedLabel && (
                <p className="mt-1 text-slate-400">拒否: {metaDeclinedLabel}</p>
              )}
              <p className="mt-1 text-slate-400">
                取得状況が不明な場合はApp Reviewと権限設定を確認してください（推定）。
              </p>
            </div>
            {googlePermissionNotice && (
              <Callout title="Google 権限の注意" tone="warning">
                <p>原因: {googlePermissionNotice.cause}</p>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {googlePermissionNotice.actions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div>
                  <a
                    href="/docs/providers/google-business-profile"
                    className={adminActionSecondaryClass}
                  >
                    Google手順書を確認する
                  </a>
                </div>
              </Callout>
            )}
            {metaPermissionNotice && (
              <Callout title="Meta 権限の注意" tone="warning">
                <p>原因: {metaPermissionNotice.cause}</p>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {metaPermissionNotice.actions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div>
                  <a
                    href="/docs/providers/meta-facebook-instagram"
                    className={adminActionSecondaryClass}
                  >
                    Meta手順書を確認する
                  </a>
                </div>
              </Callout>
            )}
            {googleApiAccessFlag === false && (
              <Callout title="Google API承認" tone="warning">
                <p>原因: API承認が未完了の可能性が高いです。</p>
                <p>次にやること: 承認完了後に再接続してください。</p>
                <div>
                  <a
                    href="/docs/providers/google-business-profile"
                    className={adminActionSecondaryClass}
                  >
                    申請手順を確認する
                  </a>
                </div>
              </Callout>
            )}
            {googleConnection?.message && (
              <Callout title="Google 接続" tone="warning">
                <p>原因: {googleConnection.message}</p>
                <p>次にやること: 再認可または接続設定を確認してください。</p>
              </Callout>
            )}
            {metaConnection?.message && (
              <Callout title="Meta 接続" tone="warning">
                <p>原因: {metaConnection.message}</p>
                <p>次にやること: 再認可または権限設定を確認してください。</p>
              </Callout>
            )}
            <div className="flex flex-wrap gap-3">
              <a href="/admin/provider-health" className={adminActionSecondaryClass}>
                実機ヘルスチェックを開く
              </a>
              <a
                href="/docs/runbooks/switch-mock-to-real"
                className={adminActionSecondaryClass}
              >
                モック→実機の切り替え手順
              </a>
            </div>
            <p className="text-sm text-slate-400">
              対象組織: {org?.name ?? "未設定"}
            </p>
          </CardContent>
        </Card>

        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <p className="text-base font-semibold text-slate-100">画像アップロード</p>
            <p className="text-sm text-slate-300">
              Supabase Storageの設定状況を確認します。
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>バケット</span>
              <Badge variant={mediaConfig.bucket ? "success" : "warning"}>
                {mediaConfig.bucket ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>サービスキー</span>
              <Badge
                variant={
                  process.env.SUPABASE_SERVICE_ROLE_KEY ? "success" : "warning"
                }
              >
                {process.env.SUPABASE_SERVICE_ROLE_KEY ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>署名URL期限</span>
              <Badge variant="muted">
                {mediaConfig.signedUrlTtlSeconds}秒
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>最大アップロード</span>
              <Badge variant="muted">{mediaConfig.maxUploadMb}MB</Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>利用可否</span>
              <Badge variant={storageReady ? "success" : "warning"}>
                {storageReady ? "利用可能" : "未準備"}
              </Badge>
            </div>
            {providerMockMode && (
              <Callout title="モック運用" tone="warning">
                <p>モックモードではStorage未設定でもアップロードできます。</p>
              </Callout>
            )}
          </CardContent>
        </Card>

        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <p className="text-base font-semibold text-slate-100">次にやること</p>
            <p className="text-sm text-slate-300">
              未完了の項目がある場合に確認してください。
            </p>
          </CardHeader>
          <CardContent>
            {nextSteps.length === 0 ? (
              <Callout title="準備完了" tone="info">
                <p>主要な準備は完了しています。</p>
              </Callout>
            ) : (
              <Callout title="次にやること" tone="warning">
                <ul className="list-disc space-y-2 pl-4 text-sm">
                  {nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </Callout>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
