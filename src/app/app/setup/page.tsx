import Link from "next/link";

import { ActionGroup } from "@/components/ui/ActionGroup";
import { buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getMembershipRole, hasRequiredRole, isSystemAdmin } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { checkJobRunsSchema, checkJobSchedulesSchema } from "@/server/services/diagnostics";
import { getLatestJobRun } from "@/server/services/jobs/job-runs";
import { GBP_BULK_REVIEW_SYNC_JOB_KEY } from "@/server/services/jobs/gbp-bulk-review-sync";
import { getJobSchedule } from "@/server/services/jobs/job-schedules";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { getSetupStatus } from "@/server/services/setup-status";
import { countPostTemplates } from "@/server/services/post-templates";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/server/utils/env";

import {
  BulkReviewSyncCard,
  type BulkReviewSyncScheduleView,
  type BulkReviewSyncView,
} from "./BulkReviewSyncCard";
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

function mapTemplateReason(reason: string | null) {
  if (!reason) return null;
  if (
    reason.includes("Supabase") ||
    reason.includes("SUPABASE") ||
    reason.includes("post_templates")
  ) {
    return "テンプレの準備状況を確認できません。管理者に確認してください。";
  }
  return reason;
}

function resolveAutoBadge(status: "done" | "not_done" | "unknown") {
  if (status === "done") return { label: "自動判定: 済", variant: "success" as const };
  if (status === "unknown") return { label: "自動判定: 不明", variant: "muted" as const };
  return { label: "自動判定: 未", variant: "warning" as const };
}

const actionLinkPrimary = buttonStyles({ variant: "primary", size: "md" });
const actionLinkSecondary = buttonStyles({ variant: "secondary", size: "md" });

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
        <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">
          初期設定
        </h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          ログイン後に初期設定を進められます。
        </p>
        <Link
          href="/auth/sign-in"
          className="text-[color:var(--primary)] underline"
        >
          サインインへ
        </Link>
      </div>
    );
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">
          初期設定
        </h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          管理者情報が確認できません。管理者に確認してください。
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
  const jobSchedulesSchema = await checkJobSchedulesSchema();
  const schedule = await getJobSchedule({
    organizationId: org.id,
    jobKey: GBP_BULK_REVIEW_SYNC_JOB_KEY,
  });
  const postTemplates = await countPostTemplates({ organizationId: org.id });

  const canManageOrg = hasRequiredRole(role, "admin");
  const canRunBulk =
    canManageOrg &&
    isSupabaseConfigured() &&
    isSupabaseAdminConfigured() &&
    jobRunsSchema.status === "ok";
  const bulkDisabledReason = !canManageOrg
    ? "管理者のみ実行できます。"
    : !isSupabaseConfigured()
      ? "準備が整っていないため実行できません。"
      : !isSupabaseAdminConfigured()
        ? "管理用の設定が不足しているため実行できません。"
        : jobRunsSchema.status !== "ok"
          ? "必要な準備が完了していないため実行できません。"
          : null;
  const canManageSchedule =
    canManageOrg &&
    isSupabaseConfigured() &&
    isSupabaseAdminConfigured() &&
    jobSchedulesSchema.status === "ok";
  const scheduleDisabledReason = !canManageOrg
    ? "管理者のみ保存できます。"
    : !isSupabaseConfigured()
      ? "準備が整っていないため保存できません。"
      : !isSupabaseAdminConfigured()
        ? "管理用の設定が不足しているため保存できません。"
        : jobSchedulesSchema.status !== "ok"
          ? "必要な準備が完了していないため保存できません。"
          : null;
  const stepMap = new Map(status.steps.map((step) => [step.key, step]));

  const googleSteps = [
    "connect_google",
    "link_gbp_location",
    "post_test_google",
  ];
  const metaSteps = ["connect_meta", "link_fb_page", "post_test_meta"];
  const storageSteps = ["enable_storage"];

  const bulkSyncView: BulkReviewSyncView | null = latestJob
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
  const bulkScheduleView: BulkReviewSyncScheduleView = {
    enabled: schedule?.enabled ?? false,
    cadenceMinutes: schedule?.cadenceMinutes ?? 1440,
    nextRunAt: schedule?.nextRunAt ?? null,
    lastEnqueuedAt: schedule?.lastEnqueuedAt ?? null,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">
          初期設定
        </h1>
        <p className="text-base text-[color:var(--text-muted)] leading-relaxed">
          状況を集計して、次にやることを案内します。
        </p>
      </div>

      <Card tone="light">
        <CardHeader>
          <p className="text-base font-semibold text-[color:var(--text-strong)]">進捗</p>
          <p className="text-sm text-[color:var(--text-muted)]">
            完了 {status.progress.completedSteps} / {status.progress.totalSteps}（
            {status.progress.percent}%）
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-2 w-full rounded-full bg-[color:var(--surface-contrast)]">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${status.progress.percent}%` }}
            />
          </div>
          {status.saveReadReason && (
            <p className="text-sm text-amber-700">{status.saveReadReason}</p>
          )}
          <Link
            href="/docs/runbooks/setup-progress-governance"
            className={actionLinkSecondary}
          >
            完了チェックの運用ルールを確認する
          </Link>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card tone="light">
          <CardHeader>
            <p className="text-base font-semibold text-[color:var(--text-strong)]">
              連携の動作確認（管理者向け）
            </p>
            <p className="text-sm text-[color:var(--text-muted)]">
              最短で確認する手順をまとめています。管理者のみ参照してください。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[color:var(--text-default)]">
            <p>
              Google連携→店舗を選ぶ→投稿→口コミの取り込み→返信、SNS連携→ページを選ぶ→投稿（画像含む）、
              一括取り込み/スケジュール、操作履歴の確認までをクリック単位でまとめています。
            </p>
            <ActionGroup>
              <Link
                href="/docs/runbooks/real-mode-smoke-test"
                className={actionLinkSecondary}
              >
                連携の動作確認手順を見る
              </Link>
            </ActionGroup>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card tone="light">
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-[color:var(--text-strong)]">店舗</p>
              <Badge variant={status.locationsCount > 0 ? "success" : "warning"}>
                {status.locationsCount}件
              </Badge>
            </div>
            <p className="text-sm text-[color:var(--text-muted)]">
              連携の対象となる店舗を管理します。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[color:var(--text-default)]">
            <Link href="/app/locations" className={actionLinkPrimary}>
              店舗一覧を開く
            </Link>
          </CardContent>
        </Card>

        <Card tone="light">
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-[color:var(--text-strong)]">
                Googleの連携
              </p>
              <Badge variant={status.providerConnected.google ? "success" : "warning"}>
                {status.providerConnected.google ? "接続済み" : "未接続"}
              </Badge>
            </div>
            <p className="text-sm text-[color:var(--text-muted)]">
              連携 → 店舗を選ぶ → 投稿の動作確認を順に進めます。
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[color:var(--text-default)]">
            <div className="space-y-1">
              <p>店舗を選んだ数: {status.linkedCounts.gbpLinked}件</p>
              <p>投稿回数: {formatCount(status.postsSummary.google.total)}件</p>
              <p>最終投稿: {formatDate(status.postsSummary.google.lastAt)}</p>
              <p>直近の結果: {mapStatusLabel(status.postsSummary.google.lastStatus)}</p>
              <p>失敗件数: {formatCount(status.postsSummary.google.failedCount)}件</p>
              {status.postsSummary.google.reason && (
                <p className="text-xs text-amber-700">
                  {status.postsSummary.google.reason}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p>口コミ件数: {formatCount(status.reviewsSummary.gbp.total)}件</p>
              <p>最終取り込み: {formatDate(status.reviewsSummary.gbp.lastSyncAt)}</p>
              <p>直近の結果: {mapSyncStatus(status.reviewsSummary.gbp.lastSyncStatus)}</p>
              <p>最終返信: {formatDate(status.reviewsSummary.gbp.lastReplyAt)}</p>
              {status.reviewsSummary.gbp.reason && (
                <p className="text-xs text-amber-700">
                  {status.reviewsSummary.gbp.reason}
                </p>
              )}
              <Link href="/app/locations" className={actionLinkPrimary}>
                口コミを取り込む
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
                    className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text-strong)]">
                          {step.label}
                        </p>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          {step.description}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {step.autoReason && (
                      <p className="mt-1 text-xs text-amber-700">
                        {step.autoReason}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href={step.link}
                        className={actionLinkSecondary}
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

        {canManageOrg && (
          <BulkReviewSyncCard
            key={`${bulkScheduleView.enabled}-${bulkScheduleView.cadenceMinutes}-${bulkScheduleView.nextRunAt ?? "none"}`}
            canRun={canRunBulk}
            disabledReason={bulkDisabledReason}
            latest={bulkSyncView}
            schedule={bulkScheduleView}
            canManageSchedule={canManageSchedule}
            scheduleDisabledReason={scheduleDisabledReason}
          />
        )}

        <Card tone="light">
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-[color:var(--text-strong)]">
                SNSの連携
              </p>
              <Badge variant={status.providerConnected.meta ? "success" : "warning"}>
                {status.providerConnected.meta ? "接続済み" : "未接続"}
              </Badge>
            </div>
            <p className="text-sm text-[color:var(--text-muted)]">
              連携 → ページを選ぶ → 投稿の動作確認を順に進めます。
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[color:var(--text-default)]">
            <div className="space-y-1">
              <p>店舗を選んだ数: {status.linkedCounts.metaLinked}件</p>
              <p>投稿回数: {formatCount(status.postsSummary.meta.total)}件</p>
              <p>最終投稿: {formatDate(status.postsSummary.meta.lastAt)}</p>
              <p>直近の結果: {mapStatusLabel(status.postsSummary.meta.lastStatus)}</p>
              <p>失敗件数: {formatCount(status.postsSummary.meta.failedCount)}件</p>
              {status.postsSummary.meta.reason && (
                <p className="text-xs text-amber-700">
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
                    className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text-strong)]">
                          {step.label}
                        </p>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          {step.description}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {step.autoReason && (
                      <p className="mt-1 text-xs text-amber-700">
                        {step.autoReason}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href={step.link}
                        className={actionLinkSecondary}
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

        <Card tone="light">
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-[color:var(--text-strong)]">画像アップロード</p>
              <Badge variant={status.mediaSummary.storageReady ? "success" : "warning"}>
                {status.mediaSummary.storageReady ? "有効" : "未設定"}
              </Badge>
            </div>
            <p className="text-sm text-[color:var(--text-muted)]">
              Storageを設定して画像投稿を有効化します。
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[color:var(--text-default)]">
            <p>署名URL期限: {status.mediaSummary.signedUrlTtlSeconds}秒</p>
            <p>最大アップロード: {status.mediaSummary.maxUploadMb}MB</p>
            <p>アップロード件数: {formatCount(status.mediaSummary.uploadedCount)}件</p>
            <p>
              最終アップロード:{" "}
              {formatDate(status.mediaSummary.lastUploadedAt)}
            </p>
            {status.mediaSummary.reason && (
              <p className="text-xs text-amber-700">{status.mediaSummary.reason}</p>
            )}
            <div className="space-y-2">
              {storageSteps.map((key) => {
                const step = stepMap.get(key);
                if (!step) return null;
                const badge = resolveAutoBadge(step.autoStatus);
                return (
                  <div
                    key={step.key}
                    className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text-strong)]">
                          {step.label}
                        </p>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          {step.description}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {step.autoReason && (
                      <p className="mt-1 text-xs text-amber-700">
                        {step.autoReason}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href={step.link}
                        className={actionLinkSecondary}
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

        <Card tone="light">
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-[color:var(--text-strong)]">投稿テンプレ</p>
              <Badge
                variant={
                  postTemplates.count && postTemplates.count > 0
                    ? "success"
                    : "warning"
                }
              >
                {postTemplates.count === null ? "不明" : `${postTemplates.count}件`}
              </Badge>
            </div>
            <p className="text-sm text-[color:var(--text-muted)]">
              テンプレを用意すると、投稿が短時間で作れます。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[color:var(--text-default)]">
            {mapTemplateReason(postTemplates.reason) ? (
              <p className="text-xs text-amber-700">
                {mapTemplateReason(postTemplates.reason)}
              </p>
            ) : postTemplates.count === 0 ? (
              <p className="text-xs text-amber-700">
                まだテンプレがありません。まず1件作ると便利です。
              </p>
            ) : (
              <p>テンプレの数に応じて、投稿の初期文が自動で入ります。</p>
            )}
            <Link href="/app/post-templates" className={actionLinkPrimary}>
              テンプレを管理する
            </Link>
            <Link
              href="/docs/runbooks/post-templates-onboarding"
              className={actionLinkSecondary}
            >
              作成手順を見る
            </Link>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card tone="light">
            <CardHeader>
              <p className="text-base font-semibold text-[color:var(--text-strong)]">
                運用ツール（管理者向け）
              </p>
              <p className="text-sm text-[color:var(--text-muted)]">
                設定状況と連携状況の確認に使います。
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[color:var(--text-default)]">
              <Link href="/admin/release" className={actionLinkPrimary}>
                リリース準備を開く
              </Link>
              <Link href="/admin/diagnostics" className={actionLinkPrimary}>
                診断を開く
              </Link>
              <Link href="/admin/provider-health" className={actionLinkPrimary}>
                連携状況チェックを開く
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
