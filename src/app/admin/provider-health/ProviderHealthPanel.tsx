"use client";

import { useFormState } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  return (
    <Card tone="dark">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-slate-200">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>最終実行</span>
          <span>{formatUpdatedAt(state.updatedAt)}</span>
        </div>
        {typeof apiCallEnabled === "boolean" && (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>外部API呼び出し</span>
            <Badge variant={apiCallEnabled ? "success" : "warning"}>
              {apiCallEnabled ? "有効" : "無効"}
            </Badge>
          </div>
        )}

        {state.error && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            {state.error}
          </div>
        )}

        {state.result?.checks && (
          <div className="space-y-2">
            {state.result.checks.map((check) => (
              <div
                key={check.name}
                className="flex items-start justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <div>
                  <p className="text-[11px] text-slate-400">{check.name}</p>
                  <p className="text-xs text-slate-200">{check.summary}</p>
                </div>
                <Badge variant={check.ok ? "success" : "warning"}>
                  {check.ok ? "OK" : "NG"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {state.result?.debug?.httpStatus && (
          <p className="text-[11px] text-slate-400">
            HTTPステータス: {state.result.debug.httpStatus}
          </p>
        )}

        {blockedReason && (
          <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-[11px] text-slate-400">原因</p>
            <p className="text-xs text-slate-200">{blockedReason.cause}</p>
          </div>
        )}

        {nextActions.length ? (
          <div>
            <p className="text-[11px] text-slate-400">次にやること</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-200">
              {nextActions.map((actionItem) => (
                <li key={actionItem}>{actionItem}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form action={action}>
          <Button
            type="submit"
            className="w-full bg-amber-400 text-slate-900 hover:bg-amber-300 focus-visible:outline-amber-300"
          >
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
        description="ページ一覧の読み取りで権限状態を確認します。"
        state={metaState}
        action={metaAction}
      />
    </div>
  );
}
