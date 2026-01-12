import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { DetailsDisclosure } from "@/components/ui/details-disclosure";
import { maskSensitiveJson } from "@/lib/redaction";
import type { JobRun } from "@/server/services/jobs/job-runs";

type ColumnDef<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

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

export function createJobColumns(): ColumnDef<JobRun>[] {
  return [
    {
      header: "ジョブ",
      cell: (job) => job.jobKey,
      cellClassName: "min-w-[180px] text-slate-100",
    },
    {
      header: "組織",
      cell: (job) => job.organizationName ?? job.organizationId,
      cellClassName: "text-slate-300",
    },
    {
      header: "状態",
      cell: (job) => (
        <Badge variant={statusVariant(job.status)}>
          {statusLabel(job.status)}
        </Badge>
      ),
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "開始",
      cell: (job) => formatDate(job.startedAt),
      cellClassName: "whitespace-nowrap font-mono text-xs text-slate-300",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "終了",
      cell: (job) => formatDate(job.finishedAt),
      cellClassName: "whitespace-nowrap font-mono text-xs text-slate-300",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "対象数",
      cell: (job) => `${formatCount(job.summary.totalLocations)}件`,
      cellClassName: "whitespace-nowrap text-slate-300",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "成功",
      cell: (job) => `${formatCount(job.summary.successCount)}件`,
      cellClassName: "whitespace-nowrap text-slate-300",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "失敗",
      cell: (job) => `${formatCount(job.summary.failedCount)}件`,
      cellClassName: "whitespace-nowrap text-slate-300",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "レビュー件数",
      cell: (job) => `${formatCount(job.summary.reviewCount)}件`,
      cellClassName: "whitespace-nowrap text-slate-300",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "詳細",
      cell: (job) => {
        const hasError = Object.keys(job.error ?? {}).length > 0;
        const summaryText = JSON.stringify(
          maskSensitiveJson(job.summary ?? {}),
          null,
          2
        );
        const errorText = JSON.stringify(
          maskSensitiveJson(job.error ?? {}),
          null,
          2
        );
        return (
          <DetailsDisclosure
            tone="dark"
            items={[
              { label: "実行ID", value: job.id, mono: true },
              {
                label: "実行者ID",
                value: job.actorUserId ?? "不明",
                mono: true,
                mask: false,
              },
              {
                label: "summary",
                value: (
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
                    {summaryText}
                  </pre>
                ),
                mask: false,
                fullWidth: true,
              },
              {
                label: "error",
                value: hasError ? (
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
                    {errorText}
                  </pre>
                ) : (
                  "なし"
                ),
                mask: false,
                fullWidth: true,
              },
              {
                label: "モック運用",
                value: job.summary.mockMode ? "有効" : "無効",
                mask: false,
              },
            ]}
          />
        );
      },
      cellClassName: "min-w-[120px]",
      headerClassName: "whitespace-nowrap",
    },
  ];
}
