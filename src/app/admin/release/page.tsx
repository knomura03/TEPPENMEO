import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/Callout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { isSystemAdmin } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { getReleaseReadiness } from "@/server/services/release-readiness";

const linkClass = "text-blue-700 underline";

export default async function ReleaseDashboardPage() {
  const user = await getSessionUser();
  const isAdmin = user ? await isSystemAdmin(user.id) : false;

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="リリース準備"
          description="システム管理者のみが閲覧できます。"
          tone="dark"
        />
        <Callout tone="warning" title="権限がありません">
          <p>system admin 権限が必要です。</p>
        </Callout>
      </div>
    );
  }

  const readiness = await getReleaseReadiness();
  const envMissing = readiness.env.mockRequired
    .filter((check) => !check.present)
    .map((check) => check.key);
  const envMissingReal = readiness.env.realRequired
    .filter((check) => !check.present)
    .map((check) => check.key);
  const migrationMissing = Object.entries(readiness.supabase.migrations).filter(
    ([, status]) => status !== "ok"
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="リリース準備"
        description="実機リリースに必要な項目を一画面で確認します。値は表示せず、設定済み/未設定だけを示します。"
        tone="dark"
      />

      <Card tone="dark">
        <CardHeader className="border-slate-800">
          <p className="text-base font-semibold text-slate-100">環境と公開情報</p>
          <p className="text-sm text-slate-300">
            モック/実機、APP_BASE_URL、公開情報の設定状況を確認します。
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-200">
          <div className="flex items-center justify-between">
            <span>モックモード</span>
            <Badge variant={readiness.env.providerMockMode ? "warning" : "success"}>
              {readiness.env.providerMockMode ? "ON" : "OFF"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>APP_BASE_URL</span>
            <Badge variant={readiness.env.appBaseUrlSet ? "success" : "warning"}>
              {readiness.env.appBaseUrlSet ? "設定済み" : "未設定"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>運営者/連絡先 (PUBLIC_*)</span>
            <Badge variant={readiness.env.publicInfoSet ? "success" : "warning"}>
              {readiness.env.publicInfoSet ? "設定済み" : "未設定"}
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            <p>不足時の手順:</p>
            <p>- preflight: `pnpm preflight --mode mock|real`</p>
            <p>
              - 公開ページ: <Link className={linkClass} href="/">
                /
              </Link>{" "}
              <Link className={linkClass} href="/privacy">
                /privacy
              </Link>{" "}
              <Link className={linkClass} href="/terms">
                /terms
              </Link>{" "}
              <Link className={linkClass} href="/data-deletion">
                /data-deletion
              </Link>
            </p>
          </div>
          {(envMissing.length > 0 || envMissingReal.length > 0 || readiness.env.envError) && (
            <Callout tone="warning" title="次にやること">
              {readiness.env.envError && <p>形式エラー: {readiness.env.envError}</p>}
              {envMissing.length > 0 && (
                <p>モックでも必須: {envMissing.join(", ")}</p>
              )}
              {envMissingReal.length > 0 && (
                <p>
                  実機で必須: {envMissingReal.join(", ")}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <a className={linkClass} href="/docs/runbooks/release-staging">
                  stagingリリース手順
                </a>
                <a className={linkClass} href="/docs/runbooks/release-production">
                  本番リリース手順
                </a>
              </div>
            </Callout>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <p className="text-base font-semibold text-slate-100">Supabase</p>
            <p className="text-sm text-slate-300">
              接続可否とマイグレーション適用状況を確認します。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <span>接続</span>
              <Badge variant={readiness.supabase.connection ? "success" : "warning"}>
                {readiness.supabase.connection ? "正常" : "異常"}
              </Badge>
            </div>
            <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs text-slate-400">マイグレーション</p>
              {Object.entries(readiness.supabase.migrations).map(([key, status]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{key}</span>
                  <Badge variant={status === "ok" ? "success" : "warning"}>
                    {status === "ok" ? "適用済み" : status === "missing" ? "未適用" : "未判定"}
                  </Badge>
                </div>
              ))}
            </div>
            {(!readiness.supabase.connection || migrationMissing.length > 0) && (
              <Callout tone="warning" title="次にやること">
                {!readiness.supabase.connection && (
                  <p>Supabase接続を確認してください。</p>
                )}
                {migrationMissing.length > 0 && (
                  <p>未適用または未判定のマイグレーションがあります。</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <a className={linkClass} href="/docs/runbooks/supabase-migrations">
                    適用手順
                  </a>
                  <a
                    className={linkClass}
                    href="/docs/runbooks/supabase-migrations-troubleshooting"
                  >
                    トラブルシュート
                  </a>
                </div>
              </Callout>
            )}
          </CardContent>
        </Card>

        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <p className="text-base font-semibold text-slate-100">Storage / Cron / Jobs</p>
            <p className="text-sm text-slate-300">
              画像アップロードとジョブスケジュールの準備状況です。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <span>バケット</span>
              <Badge variant={readiness.storage.bucket ? "success" : "warning"}>
                {readiness.storage.bucket ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>サービスキー</span>
              <Badge variant={readiness.storage.serviceKey ? "success" : "warning"}>
                {readiness.storage.serviceKey ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>利用可否</span>
              <Badge variant={readiness.storage.ready ? "success" : "warning"}>
                {readiness.storage.ready ? "利用可能" : "未準備"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>CRON_SECRET</span>
              <Badge variant={readiness.cron.cronSecretConfigured ? "success" : "warning"}>
                {readiness.cron.cronSecretConfigured ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>自動同期ON</span>
              <Badge variant={readiness.cron.autoSyncCount ? "success" : "muted"}>
                {readiness.cron.autoSyncCount ?? "未判定"}
              </Badge>
            </div>
            {readiness.cron.autoSyncReason && (
              <Callout tone="warning" title="自動同期の注意">
                <p>{readiness.cron.autoSyncReason}</p>
              </Callout>
            )}
            <div className="flex flex-wrap gap-2">
              <a className={linkClass} href="/docs/runbooks/supabase-storage-media">
                Storage設定
              </a>
              <a className={linkClass} href="/docs/runbooks/gbp-bulk-review-sync">
                一括同期手順
              </a>
              <a className={linkClass} href="/docs/runbooks/gbp-bulk-review-sync-scheduling">
                スケジュール設定
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card tone="dark">
        <CardHeader className="border-slate-800">
          <p className="text-base font-semibold text-slate-100">プロバイダ</p>
          <p className="text-sm text-slate-300">
            接続状況と権限差分を保存済み情報から確認します（値は表示しません）。
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-200">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="font-semibold">Google</p>
              <Badge
                variant={
                  readiness.providers.connectionStatus.google === "connected"
                    ? "success"
                    : "warning"
                }
              >
                {readiness.providers.connectionStatus.google === "connected"
                  ? "接続済み"
                  : readiness.providers.connectionStatus.google === "reauth_required"
                    ? "再認可"
                    : "未接続/不明"}
              </Badge>
              <p className="text-xs text-slate-400">
                スコープ差分: {readiness.providers.googlePermissionDiff.state}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Meta</p>
              <Badge
                variant={
                  readiness.providers.connectionStatus.meta === "connected"
                    ? "success"
                    : "warning"
                }
              >
                {readiness.providers.connectionStatus.meta === "connected"
                  ? "接続済み"
                  : readiness.providers.connectionStatus.meta === "reauth_required"
                    ? "再認可"
                    : "未接続/不明"}
              </Badge>
              <p className="text-xs text-slate-400">
                権限差分: {readiness.providers.metaPermissionDiff.state}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className={linkClass} href="/docs/runbooks/google-gbp-approval-and-oauth-setup">
              Google審査・設定
            </a>
            <a className={linkClass} href="/docs/runbooks/meta-app-review-and-oauth-setup">
              Meta審査・設定
            </a>
            <a className={linkClass} href="/admin/provider-health">
              実機ヘルスチェック
            </a>
            <a className={linkClass} href="/docs/runbooks/switch-mock-to-real">
              モック→実機手順
            </a>
          </div>
        </CardContent>
      </Card>

      <Card tone="dark">
        <CardHeader className="border-slate-800">
          <p className="text-base font-semibold text-slate-100">実機スモーク</p>
          <p className="text-sm text-slate-300">
            real-mode の最短動作確認と合格基準です。Runbookで手順を確認してください。
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-200">
          <ul className="list-disc space-y-1 pl-4">
            <li>Google: 接続→紐付け→投稿→レビュー同期→返信が成功</li>
            <li>Meta: 接続→ページ紐付け→投稿（画像含む）が成功</li>
            <li>Jobs: 一括同期が成功し、スケジュールON後に履歴が増える</li>
            <li>監査ログ: フィルタ/詳細/CSVが動作し、操作が記録される</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <a className={linkClass} href="/docs/runbooks/real-mode-smoke-test">
              実機スモークテスト手順
            </a>
            <a className={linkClass} href="/admin/setup">
              セットアップへ
            </a>
            <a className={linkClass} href="/admin/diagnostics">
              診断へ
            </a>
          </div>
        </CardContent>
      </Card>

      <Card tone="dark">
        <CardHeader className="border-slate-800">
          <p className="text-base font-semibold text-slate-100">次にやること</p>
          <p className="text-sm text-slate-300">画面遷移とRunbookをまとめています。</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm text-slate-200">
          <Link className={linkClass} href="/admin/diagnostics">
            診断を確認
          </Link>
          <Link className={linkClass} href="/admin/provider-health">
            実機ヘルスチェックを実行
          </Link>
          <Link className={linkClass} href="/docs/runbooks/release-production">
            本番リリース手順を見る
          </Link>
          <Link className={linkClass} href="/docs/runbooks/release-staging">
            stagingリリース手順を見る
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
