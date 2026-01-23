import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getSessionUser } from "@/server/auth/session";
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

function MiniBarChart({
  series,
}: {
  series: Array<{ label: string; count: number }>;
}) {
  const maxValue = Math.max(1, ...series.map((item) => item.count));
  const width = 120;
  const height = 40;
  const gap = 4;
  const barWidth = Math.max(6, Math.floor((width - gap * (series.length - 1)) / series.length));

  return (
    <svg
      role="img"
      aria-label="直近7日間の口コミ数"
      width={width}
      height={height}
      className="mt-2 w-full max-w-[160px]"
    >
      {series.map((item, index) => {
        const barHeight = Math.round((item.count / maxValue) * height);
        const x = index * (barWidth + gap);
        const y = height - barHeight;
        return (
          <rect
            key={`${item.label}-${index}`}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={2}
            className="fill-[color:var(--primary)]/70"
          />
        );
      })}
    </svg>
  );
}

export default async function AppDashboard() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">ダッシュボード</h1>
        <p className="text-sm text-slate-500">
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
        <h1 className="text-2xl font-semibold text-slate-900">ダッシュボード</h1>
        <p className="text-sm text-slate-500">
          管理者情報が確認できません。管理者に確認してください。
        </p>
      </div>
    );
  }

  const metrics = await getDashboardMetrics(org.id);
  const quickLink = buttonStyles({ variant: "secondary", size: "md" });
  const primaryLink = buttonStyles({ variant: "primary", size: "md" });
  const hasSeriesData = metrics.reviews.seriesStatus === "ok";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">ダッシュボード</h1>
        <p className="text-base text-slate-600">
          {org.name} の状況をまとめて確認できます。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card tone="light">
          <CardHeader>
            <p className="text-sm text-slate-500">店舗数</p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {metrics.locationsCount}
            </h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            連携対象となる店舗数です。
          </CardContent>
        </Card>
        <Card tone="light">
          <CardHeader>
            <p className="text-sm text-slate-500">未返信の口コミ</p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {formatCount(metrics.reviews.unrepliedCount)}
            </h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            返信が必要な口コミの件数です。
          </CardContent>
        </Card>
        <Card tone="light">
          <CardHeader>
            <p className="text-sm text-slate-500">直近7日口コミ数</p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {formatCount(metrics.reviews.last7DaysCount)}
            </h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            {hasSeriesData ? (
              <>
                <MiniBarChart series={metrics.reviews.series} />
                <p className="mt-2">日別の簡易推移です。</p>
              </>
            ) : (
              "未集計のため不明です。"
            )}
          </CardContent>
        </Card>
        <Card tone="light">
          <CardHeader>
            <p className="text-sm text-slate-500">最近の投稿結果</p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {mapPostStatus(metrics.posts.lastStatus)}
            </h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            最終投稿: {formatDate(metrics.posts.lastAt)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card tone="light">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">最近の同期</h2>
              <Badge variant={jobBadgeVariant}>
                {mapJobStatus(metrics.jobs.lastStatus)}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">
              Google口コミの一括同期の結果です。
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>最終実行: {formatDate(metrics.jobs.lastFinishedAt)}</p>
            <p>
              次回予定:{" "}
              {metrics.jobs.scheduleEnabled === false
                ? "停止中"
                : formatDate(metrics.jobs.nextRunAt)}
            </p>
            <Link href="/app/setup" className={primaryLink}>
              初期設定を開く
            </Link>
          </CardContent>
        </Card>

        <Card tone="light">
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">次にやること</h2>
            <p className="text-sm text-slate-600">
              迷いやすい操作をまとめました。
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            <Link href="/app/setup" className={primaryLink}>
              初期設定を進める
            </Link>
            <Link href="/app/locations" className={quickLink}>
              店舗一覧を開く
            </Link>
            <Link href="/app/reviews" className={quickLink}>
              口コミ・コメント受信箱を開く
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card tone="light">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">最新の口コミ</h2>
          <p className="text-sm text-slate-600">直近の口コミを確認できます。</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          {metrics.reviews.latestAt ? (
            <>
              <p>投稿日: {formatDate(metrics.reviews.latestAt)}</p>
              <p>評価: {metrics.reviews.latestRating ?? "不明"}</p>
              <p className="whitespace-pre-wrap">
                {metrics.reviews.latestComment ?? "本文がありません。"}
              </p>
            </>
          ) : (
            <p>まだ口コミがありません。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
