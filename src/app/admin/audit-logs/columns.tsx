import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { DetailsDisclosure } from "@/components/ui/details-disclosure";
import { maskSensitiveJson } from "@/lib/redaction";
import { ProviderType } from "@/server/providers/types";
import type { AuditLog } from "@/server/services/audit-logs";

type ColumnDef<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

export const actionLabels: Record<string, string> = {
  "provider.connect": "プロバイダ接続",
  "provider.connect_failed": "プロバイダ接続失敗",
  "provider.disconnect": "プロバイダ切断",
  "provider.reauth_required": "再認可要求",
  "provider.link_location": "ロケーション紐付け",
  "provider.link_location_failed": "ロケーション紐付け失敗",
  "reviews.sync": "レビュー同期",
  "reviews.sync_failed": "レビュー同期失敗",
  "reviews.reply": "レビュー返信",
  "reviews.reply_failed": "レビュー返信失敗",
  "posts.publish": "投稿公開",
  "posts.publish_failed": "投稿失敗",
  "admin.user.invite": "ユーザー招待（メール）",
  "admin.user.invite_fallback": "ユーザー招待（リンク）",
  "admin.user.invite_link": "招待リンク生成",
  "admin.user.invite_failed": "ユーザー招待失敗",
  "admin.user.invite_link_failed": "招待リンク生成失敗",
  "admin.user.create_temp": "仮パスワード作成",
  "admin.user.create_failed": "ユーザー作成失敗",
  "admin.user.disable": "ユーザー無効化",
  "admin.user.disable_failed": "ユーザー無効化失敗",
  "admin.user.enable": "ユーザー再有効化",
  "admin.user.enable_failed": "ユーザー再有効化失敗",
  "admin.user.delete": "ユーザー削除",
  "admin.user.delete_failed": "ユーザー削除失敗",
  "provider.health_check": "プロバイダ実機ヘルスチェック",
  "provider.health_check_failed": "プロバイダ実機ヘルスチェック失敗",
};

export const providerLabels: Record<string, string> = {
  [ProviderType.GoogleBusinessProfile]: "Google Business Profile",
  [ProviderType.Meta]: "Meta",
  [ProviderType.YahooPlace]: "Yahoo!プレイス",
  [ProviderType.AppleBusinessConnect]: "Apple Business Connect",
  [ProviderType.BingMaps]: "Bing Maps",
  [ProviderType.YahooYolp]: "Yahoo! YOLP",
};

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
}

export function formatMetadataPreview(metadata: Record<string, unknown>) {
  const text = JSON.stringify(maskSensitiveJson(metadata));
  if (text === "{}") return "なし";
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function resolveProviderLabel(metadata: Record<string, unknown>) {
  const value =
    metadata.provider_type ?? metadata.providerType ?? metadata.provider;
  if (typeof value !== "string") return "不明";
  return providerLabels[value as ProviderType] ?? value;
}

export function getStatusBadge(log: AuditLog) {
  const action = log.action ?? "";
  const metadata = log.metadata ?? {};
  const hasError = Boolean(
    metadata.error ||
      metadata.error_code ||
      metadata.errorMessage ||
      metadata.error_message
  );
  if (action.includes("failed") || hasError) {
    return { label: "失敗", variant: "warning" as const };
  }
  if (action.includes("reauth_required")) {
    return { label: "要対応", variant: "muted" as const };
  }
  return { label: "成功", variant: "success" as const };
}

export function createAuditLogColumns(params: {
  organizationMap: Map<string, string>;
}): ColumnDef<AuditLog>[] {
  return [
    {
      header: "日時",
      cell: (log) => formatDate(log.createdAt),
      cellClassName: "whitespace-nowrap font-mono text-xs text-slate-300",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "操作",
      cell: (log) => actionLabels[log.action] ?? log.action,
      cellClassName: "min-w-[160px] text-slate-100",
    },
    {
      header: "組織",
      cell: (log) => {
        return (
          log.organizationName ||
          (log.organizationId
            ? params.organizationMap.get(log.organizationId) ?? log.organizationId
            : "全体")
        );
      },
      cellClassName: "text-slate-300",
    },
    {
      header: "操作者",
      cell: (log) => log.actorEmail ?? log.actorUserId ?? "不明",
      cellClassName: "text-slate-300",
    },
    {
      header: "対象",
      cell: (log) =>
        log.targetType && log.targetId
          ? `${log.targetType} / ${log.targetId}`
          : log.targetType || log.targetId || "なし",
      cellClassName: "text-slate-300",
    },
    {
      header: "プロバイダ",
      cell: (log) => resolveProviderLabel(log.metadata ?? {}),
      cellClassName: "text-slate-300",
    },
    {
      header: "状態",
      cell: (log) => {
        const status = getStatusBadge(log);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
      cellClassName: "min-w-[120px]",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "追加情報",
      cell: (log) => formatMetadataPreview(log.metadata ?? {}),
      cellClassName: "text-slate-300",
    },
    {
      header: "詳細",
      cell: (log) => {
        const metadata = maskSensitiveJson(log.metadata ?? {});
        const metadataText = JSON.stringify(metadata, null, 2);
        return (
          <DetailsDisclosure
            tone="dark"
            items={[
              { label: "ログID", value: log.id, mono: true },
              {
                label: "対象ID",
                value: log.targetId ?? "なし",
                mono: true,
                mask: false,
              },
              {
                label: "操作者ID",
                value: log.actorUserId ?? "不明",
                mono: true,
                mask: false,
              },
              {
                label: "metadata",
                value: (
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
                    {metadataText}
                  </pre>
                ),
                mask: false,
                fullWidth: true,
              },
            ]}
          />
        );
      },
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
  ];
}
