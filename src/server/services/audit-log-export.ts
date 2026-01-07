import type { ProviderType } from "@/server/providers/types";
import type { AuditLog, AuditLogFilters } from "@/server/services/audit-logs";
import { queryAuditLogs } from "@/server/services/audit-logs";

export type CsvExportResult =
  | { ok: true; csv: string; count: number }
  | { ok: false; error: string };

const DEFAULT_PAGE_SIZE = 500;
const MAX_EXPORT_ROWS = 5000;

const actionLabels: Record<string, string> = {
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
};

const sensitiveKeyPatterns = [
  "token",
  "secret",
  "password",
  "key",
  "refresh",
  "authorization",
  "invite",
];

function maskSensitiveMetadata(
  input: Record<string, unknown>
): Record<string, unknown> {
  const maskValue = (key: string, value: unknown): unknown => {
    const lowered = key.toLowerCase();
    if (sensitiveKeyPatterns.some((pattern) => lowered.includes(pattern))) {
      return "（マスク済み）";
    }
    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === "object" && item !== null
          ? maskSensitiveMetadata(item as Record<string, unknown>)
          : item
      );
    }
    if (value && typeof value === "object") {
      return maskSensitiveMetadata(value as Record<string, unknown>);
    }
    return value;
  };

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, maskValue(key, value)])
  );
}

function escapeCsvValue(value: string) {
  if (value.includes("\"")) {
    value = value.replaceAll("\"", "\"\"");
  }
  if (value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value}"`;
  }
  return value;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
}

function getStatusLabel(log: AuditLog) {
  const action = log.action ?? "";
  const metadata = log.metadata ?? {};
  const hasError = Boolean(
    metadata.error ||
      metadata.error_code ||
      metadata.errorMessage ||
      metadata.error_message
  );
  if (action.includes("failed") || hasError) return "失敗";
  if (action.includes("reauth_required")) return "要対応";
  return "成功";
}

export function buildAuditLogCsv(logs: AuditLog[]): string {
  const headers = [
    "日時",
    "操作",
    "操作コード",
    "組織",
    "組織ID",
    "操作者",
    "操作者ID",
    "対象種別",
    "対象ID",
    "状態",
    "追加情報",
  ];

  const rows = logs.map((log) => {
    const organization = log.organizationName ?? "";
    const actor = log.actorEmail ?? log.actorUserId ?? "";
    const metadata = maskSensitiveMetadata(log.metadata ?? {});
    const metadataText = JSON.stringify(metadata);
    return [
      formatDate(log.createdAt),
      actionLabels[log.action] ?? log.action,
      log.action,
      organization,
      log.organizationId ?? "",
      actor,
      log.actorUserId ?? "",
      log.targetType ?? "",
      log.targetId ?? "",
      getStatusLabel(log),
      metadataText === "{}" ? "" : metadataText,
    ];
  });

  const csvLines = [headers, ...rows].map((row) =>
    row.map((value) => escapeCsvValue(String(value ?? ""))).join(",")
  );

  return `\uFEFF${csvLines.join("\n")}`;
}

export async function exportAuditLogsCsv(input?: {
  filters?: AuditLogFilters;
  maxRows?: number;
  pageSize?: number;
}): Promise<CsvExportResult> {
  const maxRows = input?.maxRows ?? MAX_EXPORT_ROWS;
  const pageSize = input?.pageSize ?? DEFAULT_PAGE_SIZE;

  let page = 1;
  const logs: AuditLog[] = [];

  while (logs.length <= maxRows) {
    const result = await queryAuditLogs({
      filters: input?.filters,
      page,
      pageSize,
    });
    if (result.logs.length === 0) break;
    logs.push(...result.logs);
    if (logs.length > maxRows) {
      return {
        ok: false,
        error: `最大${maxRows}件までエクスポートできます。条件を絞ってください。`,
      };
    }
    if (!result.hasNext) break;
    page += 1;
  }

  const csv = buildAuditLogCsv(logs);
  return { ok: true, csv, count: logs.length };
}

export type AuditLogExportFilters = AuditLogFilters;
export type AuditLogExportProvider = ProviderType;
export { maskSensitiveMetadata };
