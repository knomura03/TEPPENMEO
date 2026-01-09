"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  runGbpBulkReviewSyncAction,
  type BulkReviewSyncActionResult,
} from "@/server/actions/gbp-bulk-review-sync";

export type BulkReviewSyncView = {
  status: "running" | "succeeded" | "failed" | "partial" | "unknown";
  startedAt: string | null;
  finishedAt: string | null;
  summary: {
    totalLocations: number | null;
    successCount: number | null;
    failedCount: number | null;
    reviewCount: number | null;
    mockMode: boolean | null;
  };
};

type BulkReviewSyncCardProps = {
  canRun: boolean;
  disabledReason: string | null;
  latest: BulkReviewSyncView | null;
};

function formatDate(value: string | null) {
  if (!value) return "未実行";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "不明";
  return date.toLocaleString("ja-JP");
}

function formatCount(value: number | null) {
  if (value === null) return "不明";
  return value.toString();
}

function mapStatusLabel(status: BulkReviewSyncView["status"]) {
  if (status === "succeeded") return "成功";
  if (status === "failed") return "失敗";
  if (status === "partial") return "一部失敗";
  if (status === "running") return "実行中";
  return "不明";
}

export function BulkReviewSyncCard({
  canRun,
  disabledReason,
  latest,
}: BulkReviewSyncCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkReviewSyncActionResult | null>(null);

  const handleRun = () => {
    startTransition(async () => {
      const response = await runGbpBulkReviewSyncAction();
      setResult(response);
      if (response.ok) {
        router.refresh();
      }
    });
  };

  const statusBadge = mapStatusLabel(latest?.status ?? "unknown");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">
            Googleレビューを一括同期
          </p>
          <Badge variant={latest?.status === "succeeded" ? "success" : "warning"}>
            {statusBadge}
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          GBP紐付け済みロケーションのレビューをまとめて同期します。
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-slate-600">
        <p>最終実行: {formatDate(latest?.finishedAt ?? latest?.startedAt ?? null)}</p>
        <p>対象ロケーション: {formatCount(latest?.summary.totalLocations ?? null)}件</p>
        <p>成功: {formatCount(latest?.summary.successCount ?? null)}件</p>
        <p>失敗: {formatCount(latest?.summary.failedCount ?? null)}件</p>
        <p>レビュー件数: {formatCount(latest?.summary.reviewCount ?? null)}件</p>
        {latest?.summary.mockMode && (
          <p className="text-[11px] text-amber-600">
            モック運用のため固定結果です。
          </p>
        )}
        {disabledReason && (
          <p className="text-[11px] text-amber-600">{disabledReason}</p>
        )}
        {result && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
            <p>{result.message}</p>
            {result.reason && <p className="mt-1">理由: {result.reason}</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleRun}
            disabled={!canRun || isPending}
          >
            {isPending ? "同期中..." : "一括同期を実行"}
          </Button>
          <a
            href="/docs/runbooks/gbp-bulk-review-sync"
            className="inline-flex items-center text-amber-600 underline"
          >
            手順書を開く
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
