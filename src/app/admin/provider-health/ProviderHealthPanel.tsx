"use client";

import { useFormState } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/Callout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  runGoogleHealthCheckAction,
  runMetaHealthCheckAction,
  type ProviderHealthActionState,
} from "@/server/actions/provider-health";

const initialState: ProviderHealthActionState = {
  result: null,
  error: null,
  updatedAt: null,
};

const statusLabels = {
  ok: { label: "OK", variant: "success" as const },
  warning: { label: "注意", variant: "warning" as const },
  error: { label: "エラー", variant: "warning" as const },
  not_configured: { label: "未設定", variant: "warning" as const },
  not_connected: { label: "未接続", variant: "warning" as const },
  idle: { label: "未実行", variant: "muted" as const },
};

function formatUpdatedAt(value: string | null) {
  if (!value) return "未実行";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未実行";
  return date.toLocaleString("ja-JP");
}

function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  const meta = statusLabels[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function HealthCard({
  title,
  description,
  state,
  action,
}: {
  title: string;
  description: string;
  state: ProviderHealthActionState;
  action: (formData: FormData) => void;
}) {
  const status = state.result?.status ?? "idle";
  const apiCallEnabled = state.result?.apiCallEnabled;
  const blockedReason = state.result?.blockedReason ?? null;
  const nextActions = blockedReason?.nextActions ?? state.result?.nextActions ?? [];
  const hasNextActions = nextActions.length > 0;

  return (
    <Card tone="light">
      <CardHeader className="border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-slate-900">{title}</p>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>最終実行</span>
          <span>{formatUpdatedAt(state.updatedAt)}</span>
        </div>
        {typeof apiCallEnabled === "boolean" && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>外部API呼び出し</span>
            <Badge variant={apiCallEnabled ? "success" : "warning"}>
              {apiCallEnabled ? "有効" : "無効"}
            </Badge>
          </div>
        )}

        {state.error && (
          <Callout title="エラー" tone="danger">
            <p>{state.error}</p>
          </Callout>
        )}

        {state.result?.checks && (
          <div className="space-y-2">
            {state.result.checks.map((check) => (
              <div
                key={check.name}
                className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-slate-500">{check.name}</p>
                  <p className="text-sm text-slate-700">{check.summary}</p>
                </div>
                <Badge variant={check.ok ? "success" : "warning"}>
                  {check.ok ? "OK" : "NG"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {state.result?.debug?.httpStatus && (
          <p className="text-sm text-slate-500">
            HTTPステータス: {state.result.debug.httpStatus}
          </p>
        )}

        {blockedReason ? (
          <Callout title="原因" tone="warning">
            <p>{blockedReason.cause}</p>
            {hasNextActions && (
              <div>
                <p className="text-sm font-semibold text-amber-100">
                  次にやること
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                  {nextActions.map((actionItem) => (
                    <li key={actionItem}>{actionItem}</li>
                  ))}
                </ul>
              </div>
            )}
          </Callout>
        ) : hasNextActions ? (
          <Callout title="次にやること" tone="info">
            <ul className="list-disc space-y-1 pl-4 text-sm">
              {nextActions.map((actionItem) => (
                <li key={actionItem}>{actionItem}</li>
              ))}
            </ul>
          </Callout>
        ) : null}

        <form action={action}>
          <Button type="submit" className="w-full min-h-[44px]" variant="primary">
            チェック実行
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProviderHealthPanel() {
  const [googleState, googleAction] = useFormState(
    runGoogleHealthCheckAction,
    initialState
  );
  const [metaState, metaAction] = useFormState(
    runMetaHealthCheckAction,
    initialState
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <HealthCard
        title="Google Business Profile"
        description="ロケーション一覧の読み取りで接続状態を確認します。"
        state={googleState}
        action={googleAction}
      />
      <HealthCard
        title="Meta（Facebook/Instagram）"
        description="ページ一覧の読み取りとコメント取得の準備状況を確認します。"
        state={metaState}
        action={metaAction}
      />
    </div>
  );
}
