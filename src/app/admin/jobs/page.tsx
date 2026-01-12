import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Callout } from "@/components/ui/Callout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const setupLinkClass = buttonStyles({
    variant: "secondary",
    size: "md",
    className: "border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900",
  });

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
          actions={
            <a href="/app/setup" className={setupLinkClass}>
              セットアップで実行する
            </a>
          }
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
            <Table tone="dark">
              <TableHeader>
                <TableRow>
                  <TableHead>ジョブ</TableHead>
                  <TableHead>組織</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>開始</TableHead>
                  <TableHead>終了</TableHead>
                  <TableHead>対象数</TableHead>
                  <TableHead>成功</TableHead>
                  <TableHead>失敗</TableHead>
                  <TableHead>レビュー件数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const hasError = Object.keys(job.error ?? {}).length > 0;
                  return (
                    <Fragment key={job.id}>
                      <TableRow>
                        <TableCell className="text-slate-100">
                          {job.jobKey}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {job.organizationName ?? job.organizationId}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(job.status)}>
                            {statusLabel(job.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {formatDate(job.startedAt)}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {formatDate(job.finishedAt)}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {formatCount(job.summary.totalLocations)}件
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {formatCount(job.summary.successCount)}件
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {formatCount(job.summary.failedCount)}件
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {formatCount(job.summary.reviewCount)}件
                        </TableCell>
                      </TableRow>
                      {(hasError || job.summary.mockMode) && (
                        <TableRow className="bg-slate-950/40 hover:bg-slate-950/40">
                          <TableCell colSpan={9} className="space-y-2">
                            {hasError && (
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
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
