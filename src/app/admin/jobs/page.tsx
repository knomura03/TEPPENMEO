import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

export default async function AdminJobsPage() {
  const jobs = await listJobRuns({ limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">ジョブ履歴</h1>
        <p className="text-sm text-slate-300">
          一括同期などの実行履歴を確認します。
        </p>
      </div>

      <Card tone="dark">
        <CardHeader>
          <p className="text-sm font-semibold">最新20件</p>
          <p className="text-xs text-slate-400">
            失敗がある場合はsummary/errorを確認してください。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobs.length === 0 ? (
            <p className="text-xs text-slate-400">履歴がありません。</p>
          ) : (
            <div className="divide-y divide-slate-800 text-xs text-slate-300">
              {jobs.map((job) => (
                <div key={job.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-100">
                        {job.jobKey}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        組織: {job.organizationName ?? job.organizationId}
                      </p>
                    </div>
                    <Badge
                      variant={
                        job.status === "succeeded" ? "success" : "warning"
                      }
                    >
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
                    <div className="rounded-md border border-amber-300/40 bg-amber-900/20 p-3 text-[11px] text-amber-100">
                      <p className="font-semibold">エラー</p>
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(job.error, null, 2)}
                      </pre>
                    </div>
                  )}
                  {job.summary.mockMode && (
                    <p className="text-[11px] text-amber-200">
                      モック運用のため固定結果です。
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
