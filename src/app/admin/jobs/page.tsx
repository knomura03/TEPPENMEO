import { buttonStyles } from "@/components/ui/button";
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

import { createJobColumns } from "./columns";

export default async function AdminJobsPage() {
  const jobs = await listJobRuns({ limit: 20 });
  const setupLinkClass = buttonStyles({
    variant: "secondary",
    size: "md",
    className: "border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--text-strong)] hover:bg-[color:var(--surface-muted)]",
  });
  const columns = createJobColumns();

  return (
    <div className="space-y-8">
      <PageHeader
        title="ジョブ履歴"
        description="一括同期などの実行履歴を確認します。"
        tone="light"
      />

      <FilterBar
        title="表示条件"
        description="現在は最新20件を固定で表示しています。"
      >
        <div className="md:col-span-6 text-sm text-[color:var(--text-muted)]">
          フィルタ機能は次の改善で追加予定です。
        </div>
      </FilterBar>

      {jobs.length === 0 ? (
        <EmptyState
          title="履歴がありません。"
          description="一括同期を実行するとここに履歴が表示されます。"
          actions={
            <a href="/app/setup" className={setupLinkClass}>
              初期設定で実行する
            </a>
          }
        />
      ) : (
        <Card tone="light">
          <CardHeader className="border-[color:var(--border)]">
            <p className="text-base font-semibold text-[color:var(--text-strong)]">最新20件</p>
            <p className="text-sm text-[color:var(--text-muted)]">
              失敗がある場合はsummary/errorを確認してください。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table tone="light">
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={column.header}
                      className={column.headerClassName}
                    >
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    {columns.map((column) => (
                      <TableCell
                        key={`${job.id}-${column.header}`}
                        className={column.cellClassName}
                      >
                        {column.cell(job)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
