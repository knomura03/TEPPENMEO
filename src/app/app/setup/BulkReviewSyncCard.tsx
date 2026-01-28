"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ActionGroup } from "@/components/ui/ActionGroup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import {
  runGbpBulkReviewSyncAction,
  type BulkReviewSyncActionResult,
} from "@/server/actions/gbp-bulk-review-sync";
import {
  saveGbpBulkReviewSchedule,
  type BulkReviewScheduleActionResult,
} from "@/server/actions/gbp-bulk-review-schedule";

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

export type BulkReviewSyncScheduleView = {
  enabled: boolean;
  cadenceMinutes: number;
  nextRunAt: string | null;
  lastEnqueuedAt: string | null;
};

type BulkReviewSyncCardProps = {
  canRun: boolean;
  disabledReason: string | null;
  latest: BulkReviewSyncView | null;
  schedule: BulkReviewSyncScheduleView;
  canManageSchedule: boolean;
  scheduleDisabledReason: string | null;
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
  schedule,
  canManageSchedule,
  scheduleDisabledReason,
}: BulkReviewSyncCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkReviewSyncActionResult | null>(null);
  const [scheduleResult, setScheduleResult] =
    useState<BulkReviewScheduleActionResult | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(schedule.enabled);
  const [cadenceMinutes, setCadenceMinutes] = useState(
    schedule.cadenceMinutes
  );

  const handleRun = () => {
    startTransition(async () => {
      const response = await runGbpBulkReviewSyncAction();
      setResult(response);
      if (response.ok) {
        router.refresh();
      }
    });
  };

  const handleScheduleSave = () => {
    startTransition(async () => {
      const response = await saveGbpBulkReviewSchedule({
        enabled: scheduleEnabled,
        cadenceMinutes,
      });
      setScheduleResult(response);
      if (response.ok) {
        router.refresh();
      }
    });
  };

  const statusBadge = mapStatusLabel(latest?.status ?? "unknown");
  const scheduleDisabled = !canManageSchedule || Boolean(scheduleDisabledReason);
  const nextRunLabel = scheduleEnabled
    ? formatDate(schedule.nextRunAt)
    : "停止中";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-[color:var(--text-strong)]">
            口コミをまとめて取り込む
          </p>
          <Badge variant={latest?.status === "succeeded" ? "success" : "warning"}>
            {statusBadge}
          </Badge>
        </div>
        <p className="text-sm text-[color:var(--text-muted)]">
          Googleの店舗情報とつないだ店舗をまとめて取り込みます。
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-[color:var(--text-default)]">
        <p>最終実行: {formatDate(latest?.finishedAt ?? latest?.startedAt ?? null)}</p>
        <p>対象店舗: {formatCount(latest?.summary.totalLocations ?? null)}件</p>
        <p>成功: {formatCount(latest?.summary.successCount ?? null)}件</p>
        <p>失敗: {formatCount(latest?.summary.failedCount ?? null)}件</p>
        <p>口コミ件数: {formatCount(latest?.summary.reviewCount ?? null)}件</p>
        <p>次回予定: {nextRunLabel}</p>
        {latest?.summary.mockMode && (
          <p className="text-sm text-amber-700">
            デモ（仮データ）のため固定結果です。
          </p>
        )}
        {disabledReason && (
          <p className="text-sm text-amber-700">{disabledReason}</p>
        )}
        {result && (
          <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm text-[color:var(--text-muted)]">
            <p>{result.message}</p>
            {result.reason && <p className="mt-1">理由: {result.reason}</p>}
          </div>
        )}
        <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-sm font-semibold text-[color:var(--text-strong)]">自動取り込み</p>
          <ActionGroup className="mt-3 items-end">
            <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(event) => setScheduleEnabled(event.target.checked)}
                disabled={scheduleDisabled || isPending}
                className="h-4 w-4 rounded border-[color:var(--border)]"
              />
              <span>有効にする</span>
            </label>
            <div className="min-w-[180px]">
              <FormField label="頻度">
                <Select
                  value={cadenceMinutes}
                  onChange={(event) => setCadenceMinutes(Number(event.target.value))}
                  disabled={scheduleDisabled || isPending || !scheduleEnabled}
                >
                  <option value={360}>6時間ごと</option>
                  <option value={1440}>24時間ごと</option>
                </Select>
              </FormField>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleScheduleSave}
              disabled={scheduleDisabled || isPending}
            >
              {isPending ? "保存中..." : "設定を保存"}
            </Button>
          </ActionGroup>
          {scheduleDisabledReason && (
            <p className="mt-2 text-sm text-amber-700">
              {scheduleDisabledReason}
            </p>
          )}
          {scheduleResult && (
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              {scheduleResult.message}
            </p>
          )}
        </div>
        <ActionGroup>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRun}
            disabled={!canRun || isPending}
          >
            {isPending ? "取り込み中..." : "まとめて取り込む"}
          </Button>
          <a
            href="/docs/runbooks/gbp-bulk-review-sync"
            className="inline-flex items-center text-[color:var(--primary)] underline"
          >
            まとめて取り込む手順を見る
          </a>
        </ActionGroup>
      </CardContent>
    </Card>
  );
}
