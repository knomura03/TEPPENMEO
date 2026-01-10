import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/Callout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { listJobRuns } from "@/server/services/jobs/job-runs";

function formatDate(value: string | null) {
  if (!value) return "未記録";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "不明";
  return date.toLocaleString("ja-JP");
}

function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "不明";
  return value.toString();
}

function statusLabel(status: string) {
  if (status === "succeeded") return "成功";
  if (status === "failed") return "失敗";
  if (status === "partial") return "一部失敗";
  if (status === "running") return "実行中";
  return "不明";
}

function statusVariant(status: string) {
  if (status === "succeeded") return "success" as const;
  if (status === "running") return "muted" as const;
  return "warning" as const;
}

export default async function AdminJobsPage() {
  const jobs = await listJobRuns({ limit: 20 });

  return (
    <div className="space-y-8">
      <PageHeader
        title="ジョブ履歴"
        description="一括同期などの実行履歴を確認します。"
        tone="dark"
      />

      <FilterBar
        title="表示条件"
        description="現在は最新20件を固定で表示しています。"
      >
        <div className="md:col-span-6 text-sm text-slate-300">
          フィルタ機能は次の改善で追加予定です。
        </div>
      </FilterBar>

      {jobs.length === 0 ? (
        <EmptyState
          title="履歴がありません。"
          description="一括同期を実行するとここに履歴が表示されます。"
        />
      ) : (
        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <p className="text-base font-semibold text-slate-100">最新20件</p>
            <p className="text-sm text-slate-300">
              失敗がある場合はsummary/errorを確認してください。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y divide-slate-800 text-sm text-slate-300">
              {jobs.map((job) => (
                <div key={job.id} className="space-y-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-100">
                        {job.jobKey}
                      </p>
                      <p className="text-sm text-slate-400">
                        組織: {job.organizationName ?? job.organizationId}
                      </p>
                    </div>
                    <Badge variant={statusVariant(job.status)}>
                      {statusLabel(job.status)}
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p>開始: {formatDate(job.startedAt)}</p>
                    <p>終了: {formatDate(job.finishedAt)}</p>
                    <p>対象数: {formatCount(job.summary.totalLocations)}件</p>
                    <p>成功: {formatCount(job.summary.successCount)}件</p>
                    <p>失敗: {formatCount(job.summary.failedCount)}件</p>
                    <p>レビュー件数: {formatCount(job.summary.reviewCount)}件</p>
                  </div>
                  {Object.keys(job.error ?? {}).length > 0 && (
                    <Callout title="エラー" tone="warning">
                      <pre className="whitespace-pre-wrap break-words text-sm text-amber-100">
                        {JSON.stringify(job.error, null, 2)}
                      </pre>
                    </Callout>
                  )}
                  {job.summary.mockMode && (
                    <Callout title="モック運用" tone="info">
                      <p>モック運用のため固定結果です。</p>
                    </Callout>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
