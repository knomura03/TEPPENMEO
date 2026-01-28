import Link from "next/link";

import { ActionGroup } from "@/components/ui/ActionGroup";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Chart } from "@/components/ui/Chart";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { RangeTabs } from "@/components/ui/RangeTabs";
import { buildHrefWithParams } from "@/lib/pagination";
import { getSessionUser } from "@/server/auth/session";
import {
  getDashboardTimeseries,
  type DashboardRange,
} from "@/server/services/dashboard-timeseries";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { getDashboardMetrics } from "@/server/services/dashboard-metrics";

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

function mapPostStatus(value: string | null) {
  if (!value) return "未投稿";
  if (value === "published") return "成功";
  if (value === "failed") return "失敗";
  if (value === "queued") return "送信中";
  if (value === "draft") return "下書き";
  return "不明";
}

function mapJobStatus(value: string | null) {
  if (!value) return "未実行";
  if (value === "succeeded") return "成功";
  if (value === "failed") return "失敗";
  if (value === "partial") return "一部失敗";
  if (value === "running") return "実行中";
  return "不明";
}

type DashboardSearchParams = {
  range?: string | string[];
  compare?: string | string[];
  chart?: string | string[];
};

function normalizeParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

function formatDeltaText(delta: { diff: number; percent: number | null } | null) {
  if (!delta) return "比較なし";
  const diffText = delta.diff === 0 ? "±0" : delta.diff > 0 ? `+${delta.diff}` : `${delta.diff}`;
  if (delta.percent === null) {
    return `前期間比 ${diffText}件`;
  }
  const percentText =
    delta.percent === 0 ? "±0.0" : delta.percent > 0 ? `+${delta.percent.toFixed(1)}` : delta.percent.toFixed(1);
  return `前期間比 ${percentText}%（${diffText}件）`;
}

export default async function AppDashboard({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const params = await searchParams;
  const rangeParam = normalizeParam(params.range);
  const compareParam = normalizeParam(params.compare);
  const chartParam = normalizeParam(params.chart);
  const range = (rangeParam === "30d" || rangeParam === "90d" ? rangeParam : "7d") as DashboardRange;
  const compareEnabled = compareParam === "1";
  const chartType = chartParam === "bar" ? "bar" : "line";
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">ダッシュボード</h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          ログイン後に店舗の状況を確認できます。
        </p>
        <Link href="/auth/sign-in" className="text-[color:var(--primary)] underline">
          サインインへ
        </Link>
      </div>
    );
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">ダッシュボード</h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          管理情報が確認できません。管理者に確認してください。
        </p>
      </div>
    );
  }

  const metrics = await getDashboardMetrics(org.id);
  const timeseries = await getDashboardTimeseries({
    organizationId: org.id,
    range,
    compare: compareEnabled,
  });
  const primaryLink = buttonStyles({ variant: "primary", size: "md" });
  const secondaryLink = buttonStyles({ variant: "secondary", size: "md" });
  const jobBadgeVariant =
    metrics.jobs.lastStatus === "succeeded"
      ? "success"
      : metrics.jobs.lastStatus === "failed"
        ? "warning"
        : metrics.jobs.lastStatus === "partial"
          ? "warning"
          : metrics.jobs.lastStatus === "running"
            ? "default"
            : "muted";

  const rangeOptions = [
    { value: "7d", label: "7日" },
    { value: "30d", label: "30日" },
    { value: "90d", label: "90日" },
  ];
  const compareHref = buildHrefWithParams("/app", params, {
    compare: compareEnabled ? null : "1",
  });
  const lineHref = buildHrefWithParams("/app", params, { chart: "line" });
  const barHref = buildHrefWithParams("/app", params, { chart: "bar" });
  const compareButtonClass = buttonStyles({
    variant: compareEnabled ? "primary" : "secondary",
    size: "sm",
  });
  const chartButtonClass = (active: boolean) =>
    buttonStyles({ variant: active ? "primary" : "secondary", size: "sm" });
  const chartSeries = timeseries.series.map((point) => ({
    label: point.label,
    value: point.inboundCount,
  }));
  const compareSeries = timeseries.compareSeries?.map((point) => ({
    label: point.label,
    value: point.inboundCount,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="ダッシュボード"
        description={`${org.name} の状況をまとめて確認できます。`}
        tone="light"
        actions={
          <Link href="/app/setup" className={primaryLink}>
            初期設定を進める
          </Link>
        }
      />

      <Card tone="light">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">店舗パフォーマンス</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            直近の反応をまとめています。
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-xs text-[color:var(--text-muted)]">未返信の口コミ</p>
            <p className="mt-2 text-3xl font-semibold text-[color:var(--text-strong)]">
              {formatCount(metrics.reviews.unrepliedCount)}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">対応が必要な件数</p>
          </div>
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-xs text-[color:var(--text-muted)]">直近7日口コミ</p>
            <p className="mt-2 text-3xl font-semibold text-[color:var(--text-strong)]">
              {formatCount(metrics.reviews.last7DaysCount)}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">過去7日間の合計</p>
          </div>
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-xs text-[color:var(--text-muted)]">最近の投稿</p>
            <p className="mt-2 text-3xl font-semibold text-[color:var(--text-strong)]">
              {mapPostStatus(metrics.posts.lastStatus)}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              最終投稿: {formatDate(metrics.posts.lastAt)}
            </p>
          </div>
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-xs text-[color:var(--text-muted)]">店舗数</p>
            <p className="mt-2 text-3xl font-semibold text-[color:var(--text-strong)]">
              {metrics.locationsCount}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">連携対象の店舗</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card tone="light">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">口コミ・コメントの推移</h2>
                <p className="text-sm text-[color:var(--text-muted)]">
                  期間を切り替えて、反応の変化を確認できます。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <RangeTabs
                  basePath="/app"
                  currentParams={params}
                  options={rangeOptions}
                  value={range}
                  testIdPrefix="dashboard-range"
                />
                <ActionGroup>
                  <span className="text-xs font-semibold text-[color:var(--text-muted)]">比較</span>
                  <Link
                    href={compareHref}
                    className={compareButtonClass}
                    data-testid="dashboard-compare-toggle"
                  >
                    前期間と比較: {compareEnabled ? "オン" : "オフ"}
                  </Link>
                </ActionGroup>
                <ActionGroup>
                  <span className="text-xs font-semibold text-[color:var(--text-muted)]">グラフ</span>
                  <Link
                    href={lineHref}
                    className={chartButtonClass(chartType === "line")}
                    data-testid="dashboard-chart-line"
                  >
                    折れ線
                  </Link>
                  <Link
                    href={barHref}
                    className={chartButtonClass(chartType === "bar")}
                    data-testid="dashboard-chart-bar"
                  >
                    棒
                  </Link>
                </ActionGroup>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {timeseries.hasData ? (
              <Chart
                series={chartSeries}
                compareSeries={compareEnabled ? compareSeries : null}
                variant={chartType}
                ariaLabel="口コミ・コメント数の推移"
              />
            ) : (
              <EmptyState
                title="まだデータがありません"
                description="口コミ対応や投稿を行うと、ここに推移が表示されます。"
              />
            )}
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                <p className="text-xs text-[color:var(--text-muted)]">口コミ・コメント</p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--text-strong)]">
                  {timeseries.totals.inboundCount}件
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {formatDeltaText(timeseries.deltas.inboundCount)}
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                <p className="text-xs text-[color:var(--text-muted)]">返信</p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--text-strong)]">
                  {timeseries.totals.replyCount}件
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {formatDeltaText(timeseries.deltas.replyCount)}
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                <p className="text-xs text-[color:var(--text-muted)]">投稿</p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--text-strong)]">
                  {timeseries.totals.postCount}件
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {formatDeltaText(timeseries.deltas.postCount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card tone="light">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">最近の動き</h2>
            <p className="text-sm text-[color:var(--text-muted)]">
              連携サービスの更新状況です。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[color:var(--text-muted)]">
            <div className="flex items-center justify-between">
              <span>口コミの取り込み</span>
              <Badge variant={jobBadgeVariant}>{mapJobStatus(metrics.jobs.lastStatus)}</Badge>
            </div>
            <p>最終実行: {formatDate(metrics.jobs.lastFinishedAt)}</p>
            <p>
              次回予定: {metrics.jobs.scheduleEnabled === false ? "停止中" : formatDate(metrics.jobs.nextRunAt)}
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/app/reviews" className={primaryLink}>
                受信箱を開く
              </Link>
              <Link href="/app/locations" className={secondaryLink}>
                店舗詳細を開く
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card tone="light">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">次にやること</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            迷いやすい操作をまとめました。
          </p>
        </CardHeader>
        <CardContent>
          <ActionGroup>
            <Link href="/app/setup" className={primaryLink}>
              初期設定を進める
            </Link>
            <Link href="/app/posts" className={secondaryLink}>
              投稿を作る
            </Link>
            <Link href="/app/reviews" className={secondaryLink}>
              口コミ・コメントを確認する
            </Link>
          </ActionGroup>
        </CardContent>
      </Card>
    </div>
  );
}
