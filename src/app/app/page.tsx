import Link from "next/link";

import { ActionGroup } from "@/components/ui/ActionGroup";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
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

function LineChart({ series }: { series: Array<{ label: string; count: number }> }) {
  const width = 520;
  const height = 180;
  const padding = 24;
  const maxValue = Math.max(1, ...series.map((item) => item.count));
  const step = (width - padding * 2) / Math.max(1, series.length - 1);
  const points = series.map((item, index) => {
    const x = padding + index * step;
    const y = height - padding - (item.count / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  });
  const path = `M ${points.join(" L ")}`;

  return (
    <svg
      role="img"
      aria-label="口コミ数の推移"
      viewBox={`0 0 ${width} ${height}`}
      className="h-48 w-full"
    >
      <defs>
        <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${padding + (series.length - 1) * step},${height - padding} L ${padding},${height - padding} Z`}
        fill="url(#lineFill)"
      />
      <path
        d={path}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
      />
    </svg>
  );
}

export default async function AppDashboard() {
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
            <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">口コミの推移</h2>
            <p className="text-sm text-[color:var(--text-muted)]">
              直近7日間の口コミ数です。
            </p>
          </CardHeader>
          <CardContent>
            <LineChart series={metrics.reviews.series} />
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
