import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getMembershipRole, hasRequiredRole, isSystemAdmin } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { checkJobRunsSchema } from "@/server/services/diagnostics";
import { getLatestJobRun } from "@/server/services/jobs/job-runs";
import { GBP_BULK_REVIEW_SYNC_JOB_KEY } from "@/server/services/jobs/gbp-bulk-review-sync";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { getSetupStatus } from "@/server/services/setup-status";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/server/utils/env";

import { BulkReviewSyncCard, type BulkReviewSyncView } from "./BulkReviewSyncCard";
import { SetupProgressToggle } from "./SetupProgressToggle";

function formatDate(value: string | null) {
  if (!value) return "不明";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "不明";
  return date.toLocaleString("ja-JP");
}

function formatCount(value: number | null) {
  if (value === null) return "不明";
  return value.toString();
}

function mapStatusLabel(value: string | null) {
  if (!value) return "不明";
  if (value === "published") return "成功";
  if (value === "failed") return "失敗";
  if (value === "queued") return "送信中";
  return "不明";
}

function mapSyncStatus(value: "success" | "failed" | "unknown" | null) {
  if (!value || value === "unknown") return "不明";
  if (value === "success") return "成功";
  return "失敗";
}

function resolveAutoBadge(status: "done" | "not_done" | "unknown") {
  if (status === "done") return { label: "自動判定: 済", variant: "success" as const };
  if (status === "unknown") return { label: "自動判定: 不明", variant: "muted" as const };
  return { label: "自動判定: 未", variant: "warning" as const };
}

function mapJobStatus(value: string | null): BulkReviewSyncView["status"] {
  if (value === "succeeded") return "succeeded";
  if (value === "failed") return "failed";
  if (value === "partial") return "partial";
  if (value === "running") return "running";
  return "unknown";
}

export default async function SetupChecklistPage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          セットアップチェック
        </h1>
        <p className="text-sm text-slate-500">
          ログイン後にセットアップ状況を確認できます。
        </p>
        <Link href="/auth/sign-in" className="text-amber-600 underline">
          サインインへ
        </Link>
      </div>
    );
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          セットアップチェック
        </h1>
        <p className="text-sm text-slate-500">
          所属組織が見つかりません。管理者に確認してください。
        </p>
      </div>
    );
  }

  const role = await getMembershipRole(user.id, org.id);
  const isAdmin = await isSystemAdmin(user.id);
  const status = await getSetupStatus({
    organizationId: org.id,
    actorUserId: user.id,
    role,
  });
  const latestJob = await getLatestJobRun({
    organizationId: org.id,
    jobKey: GBP_BULK_REVIEW_SYNC_JOB_KEY,
  });
  const jobRunsSchema = await checkJobRunsSchema();

  const canManageOrg = hasRequiredRole(role, "admin");
  const canRunBulk =
    canManageOrg &&
    isSupabaseConfigured() &&
    isSupabaseAdminConfigured() &&
    jobRunsSchema.status === "ok";
  const bulkDisabledReason = !canManageOrg
    ? "管理者のみ実行できます。"
    : !isSupabaseConfigured()
      ? "Supabaseが未設定のため実行できません。"
      : !isSupabaseAdminConfigured()
        ? "SUPABASE_SERVICE_ROLE_KEY が未設定のため実行できません。"
        : jobRunsSchema.status !== "ok"
          ? "job_runs マイグレーションが未適用のため実行できません。"
          : null;
  const stepMap = new Map(status.steps.map((step) => [step.key, step]));

  const googleSteps = [
    "connect_google",
    "link_gbp_location",
    "post_test_google",
  ];
  const metaSteps = ["connect_meta", "link_fb_page", "post_test_meta"];
  const storageSteps = ["enable_storage"];

  const bulkSyncView = latestJob
    ? {
        status: mapJobStatus(latestJob.status),
        startedAt: latestJob.startedAt,
        finishedAt: latestJob.finishedAt,
        summary: {
          totalLocations: latestJob.summary.totalLocations ?? null,
          successCount: latestJob.summary.successCount ?? null,
          failedCount: latestJob.summary.failedCount ?? null,
          reviewCount: latestJob.summary.reviewCount ?? null,
          mockMode: latestJob.summary.mockMode ?? null,
        },
      }
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          セットアップチェック
        </h1>
        <p className="text-sm text-slate-500">
          状況を集計して、次にやることを案内します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-slate-900">進捗</p>
          <p className="text-xs text-slate-500">
            完了 {status.progress.completedSteps} / {status.progress.totalSteps}（
            {status.progress.percent}%）
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${status.progress.percent}%` }}
            />
          </div>
          {status.saveReadReason && (
            <p className="text-xs text-amber-600">{status.saveReadReason}</p>
          )}
          <Link
            href="/docs/runbooks/setup-progress-governance"
            className="text-xs text-amber-600 underline"
          >
            完了チェックの運用ルールを確認する
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">ロケーション</p>
              <Badge variant={status.locationsCount > 0 ? "success" : "warning"}>
                {status.locationsCount}件
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              連携の対象となる拠点を管理します。
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-600">
            <p>権限: {role ?? "未判定"}</p>
            <Link
              href="/app/locations"
              className="inline-flex text-amber-600 underline"
            >
              ロケーション一覧を開く
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Google</p>
              <Badge variant={status.providerConnected.google ? "success" : "warning"}>
                {status.providerConnected.google ? "接続済み" : "未接続"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              接続→GBP紐付け→投稿テストを順に進めます。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="space-y-1">
              <p>紐付け数: {status.linkedCounts.gbpLinked}件</p>
              <p>投稿回数: {formatCount(status.postsSummary.google.total)}件</p>
              <p>最終投稿: {formatDate(status.postsSummary.google.lastAt)}</p>
              <p>最終ステータス: {mapStatusLabel(status.postsSummary.google.lastStatus)}</p>
              <p>失敗件数: {formatCount(status.postsSummary.google.failedCount)}件</p>
              {status.postsSummary.google.reason && (
                <p className="text-[11px] text-amber-600">
                  {status.postsSummary.google.reason}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p>レビュー件数: {formatCount(status.reviewsSummary.gbp.total)}件</p>
              <p>最終同期: {formatDate(status.reviewsSummary.gbp.lastSyncAt)}</p>
              <p>
                直近結果:{" "}
                {mapSyncStatus(status.reviewsSummary.gbp.lastSyncStatus)}
              </p>
              <p>最終返信: {formatDate(status.reviewsSummary.gbp.lastReplyAt)}</p>
              {status.reviewsSummary.gbp.reason && (
                <p className="text-[11px] text-amber-600">
                  {status.reviewsSummary.gbp.reason}
                </p>
              )}
              <Link
                href="/app/locations"
                className="text-[11px] text-amber-600 underline"
              >
                レビュー同期を実行する
              </Link>
            </div>
            <div className="space-y-2">
              {googleSteps.map((key) => {
                const step = stepMap.get(key);
                if (!step) return null;
                const badge = resolveAutoBadge(step.autoStatus);
                return (
                  <div
                    key={step.key}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {step.label}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {step.description}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {step.autoReason && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        {step.autoReason}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href={step.link}
                        className="text-[11px] text-amber-600 underline"
                      >
                        次にやることへ
                      </Link>
                      <SetupProgressToggle
                        stepKey={step.key}
                        initialChecked={step.savedDone}
                        disabledReason={status.saveAvailable ? null : status.saveUnavailableReason}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <BulkReviewSyncCard
          canRun={canRunBulk}
          disabledReason={bulkDisabledReason}
          latest={bulkSyncView}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Meta</p>
              <Badge variant={status.providerConnected.meta ? "success" : "warning"}>
                {status.providerConnected.meta ? "接続済み" : "未接続"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              接続→FBページ紐付け→投稿テストを順に進めます。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="space-y-1">
              <p>紐付け数: {status.linkedCounts.metaLinked}件</p>
              <p>投稿回数: {formatCount(status.postsSummary.meta.total)}件</p>
              <p>最終投稿: {formatDate(status.postsSummary.meta.lastAt)}</p>
              <p>最終ステータス: {mapStatusLabel(status.postsSummary.meta.lastStatus)}</p>
              <p>失敗件数: {formatCount(status.postsSummary.meta.failedCount)}件</p>
              {status.postsSummary.meta.reason && (
                <p className="text-[11px] text-amber-600">
                  {status.postsSummary.meta.reason}
                </p>
              )}
            </div>
            <div className="space-y-2">
              {metaSteps.map((key) => {
                const step = stepMap.get(key);
                if (!step) return null;
                const badge = resolveAutoBadge(step.autoStatus);
                return (
                  <div
                    key={step.key}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {step.label}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {step.description}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {step.autoReason && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        {step.autoReason}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href={step.link}
                        className="text-[11px] text-amber-600 underline"
                      >
                        次にやることへ
                      </Link>
                      <SetupProgressToggle
                        stepKey={step.key}
                        initialChecked={step.savedDone}
                        disabledReason={status.saveAvailable ? null : status.saveUnavailableReason}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">画像アップロード</p>
              <Badge variant={status.mediaSummary.storageReady ? "success" : "warning"}>
                {status.mediaSummary.storageReady ? "有効" : "未設定"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Storageを設定して画像投稿を有効化します。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <p>署名URL期限: {status.mediaSummary.signedUrlTtlSeconds}秒</p>
            <p>最大アップロード: {status.mediaSummary.maxUploadMb}MB</p>
            <p>アップロード件数: {formatCount(status.mediaSummary.uploadedCount)}件</p>
            <p>
              最終アップロード:{" "}
              {formatDate(status.mediaSummary.lastUploadedAt)}
            </p>
            {status.mediaSummary.reason && (
              <p className="text-[11px] text-amber-600">{status.mediaSummary.reason}</p>
            )}
            <div className="space-y-2">
              {storageSteps.map((key) => {
                const step = stepMap.get(key);
                if (!step) return null;
                const badge = resolveAutoBadge(step.autoStatus);
                return (
                  <div
                    key={step.key}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {step.label}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {step.description}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {step.autoReason && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        {step.autoReason}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href={step.link}
                        className="text-[11px] text-amber-600 underline"
                      >
                        次にやることへ
                      </Link>
                      <SetupProgressToggle
                        stepKey={step.key}
                        initialChecked={step.savedDone}
                        disabledReason={status.saveAvailable ? null : status.saveUnavailableReason}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <p className="text-sm font-semibold text-slate-900">管理者向け</p>
              <p className="text-xs text-slate-500">
                設定状況と実機チェックをまとめて確認できます。
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600">
              <Link
                href="/admin/diagnostics"
                className="inline-flex text-amber-600 underline"
              >
                診断を開く
              </Link>
              <Link
                href="/admin/provider-health"
                className="inline-flex text-amber-600 underline"
              >
                実機ヘルスチェックを開く
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
