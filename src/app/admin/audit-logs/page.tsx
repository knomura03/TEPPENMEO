import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildHrefWithParams } from "@/lib/pagination";
import { listAdminOrganizations } from "@/server/services/admin-organizations";
import { ProviderType } from "@/server/providers/types";
import { queryAuditLogs } from "@/server/services/audit-logs";

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
  "provider.health_check": "プロバイダ実機ヘルスチェック",
  "provider.health_check_failed": "プロバイダ実機ヘルスチェック失敗",
};

const providerLabels: Record<string, string> = {
  [ProviderType.GoogleBusinessProfile]: "Google Business Profile",
  [ProviderType.Meta]: "Meta",
  [ProviderType.YahooPlace]: "Yahoo!プレイス",
  [ProviderType.AppleBusinessConnect]: "Apple Business Connect",
  [ProviderType.BingMaps]: "Bing Maps",
  [ProviderType.YahooYolp]: "Yahoo! YOLP",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
}

function formatMetadataPreview(metadata: Record<string, unknown>) {
  const text = JSON.stringify(metadata);
  if (text === "{}") return "なし";
  return text.length > 100 ? `${text.slice(0, 100)}…` : text;
}

function resolveProviderLabel(metadata: Record<string, unknown>) {
  const value =
    metadata.provider_type ?? metadata.providerType ?? metadata.provider;
  if (typeof value !== "string") return "不明";
  return providerLabels[value as ProviderType] ?? value;
}

function getStatusBadge(
  log: Awaited<ReturnType<typeof queryAuditLogs>>["logs"][number]
) {
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

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    action?: string;
    org?: string;
    actor?: string;
    provider?: string;
    text?: string;
    page?: string;
  }>;
}) {
  const resolved = await searchParams;
  const page = resolved.page ? Number.parseInt(resolved.page, 10) : 1;
  const providerValues = new Set(Object.values(ProviderType));
  const providerType: ProviderType | "all" = providerValues.has(
    resolved.provider as ProviderType
  )
    ? (resolved.provider as ProviderType)
    : "all";

  const filters = {
    from: resolved.from ?? "",
    to: resolved.to ?? "",
    action: resolved.action ?? "",
    organizationId: resolved.org ?? "",
    actor: resolved.actor ?? "",
    providerType,
    text: resolved.text ?? "",
  };

  const organizations = await listAdminOrganizations();
  const organizationMap = new Map(
    organizations.map((org) => [org.id, org.name])
  );

  const { logs, hasNext, pageSize } = await queryAuditLogs({
    filters,
    page: Number.isNaN(page) ? 1 : page,
    pageSize: 20,
  });

  const activeFilters: Array<{ key: string; value: string }> = [];
  if (filters.from) activeFilters.push({ key: "開始", value: filters.from });
  if (filters.to) activeFilters.push({ key: "終了", value: filters.to });
  if (filters.action)
    activeFilters.push({
      key: "操作",
      value: actionLabels[filters.action] ?? filters.action,
    });
  if (filters.organizationId)
    activeFilters.push({
      key: "組織",
      value: organizationMap.get(filters.organizationId) ?? filters.organizationId,
    });
  if (filters.actor) activeFilters.push({ key: "操作者", value: filters.actor });
  if (filters.providerType && filters.providerType !== "all")
    activeFilters.push({
      key: "プロバイダ",
      value: providerLabels[filters.providerType] ?? filters.providerType,
    });
  if (filters.text) activeFilters.push({ key: "検索", value: filters.text });

  const prevHref =
    page > 1
      ? buildHrefWithParams("/admin/audit-logs", resolved, {
          page: page - 1,
        })
      : null;
  const nextHref =
    hasNext
      ? buildHrefWithParams("/admin/audit-logs", resolved, {
          page: page + 1,
        })
      : null;

  const buildExportLink = () => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.action) params.set("action", filters.action);
    if (filters.organizationId) params.set("org", filters.organizationId);
    if (filters.actor) params.set("actor", filters.actor);
    if (filters.providerType && filters.providerType !== "all") {
      params.set("provider", filters.providerType);
    }
    if (filters.text) params.set("text", filters.text);
    const query = params.toString();
    return query ? `/admin/audit-logs/export?${query}` : "/admin/audit-logs/export";
  };
  const filterFormId = "audit-log-filter";
  const secondaryLink = buttonStyles({
    variant: "secondary",
    size: "md",
    className: "border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="監査ログ"
        description="プロバイダ連携や同期の履歴を確認します。"
        tone="dark"
      />

      <FilterBar
        title="フィルタ"
        description="現在の条件でCSVエクスポートができます（最大5000件）。"
        actions={
          <a href={buildExportLink()} className={secondaryLink}>
            CSVエクスポート
          </a>
        }
        footer={
          activeFilters.length > 0 ? (
            <>
              {activeFilters.map((item) => (
                <Badge key={`${item.key}-${item.value}`} variant="muted">
                  {item.key}: {item.value}
                </Badge>
              ))}
            </>
          ) : null
        }
      >
        <form id={filterFormId} className="contents" action="/admin/audit-logs">
          <div className="md:col-span-2">
            <FormField label="期間（開始）" tone="dark">
              <Input type="date" name="from" defaultValue={filters.from} tone="dark" />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="期間（終了）" tone="dark">
              <Input type="date" name="to" defaultValue={filters.to} tone="dark" />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="操作" tone="dark">
              <Select name="action" defaultValue={filters.action} tone="dark">
                <option value="">すべて</option>
                {Object.entries(actionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="組織" tone="dark">
              <Select name="org" defaultValue={filters.organizationId} tone="dark">
                <option value="">すべて</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="操作者（メール）" tone="dark">
              <Input
                name="actor"
                defaultValue={filters.actor}
                placeholder="admin@example.com"
                tone="dark"
              />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="プロバイダ" tone="dark">
              <Select name="provider" defaultValue={filters.providerType} tone="dark">
                <option value="all">すべて</option>
                {Object.entries(providerLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="md:col-span-4">
            <FormField label="自由検索" tone="dark">
              <Input
                name="text"
                defaultValue={filters.text}
                placeholder="action/target/metadata を検索"
                tone="dark"
              />
            </FormField>
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <Button
              type="submit"
              form={filterFormId}
              className="bg-amber-400 text-slate-900 hover:bg-amber-300 focus-visible:outline-amber-300"
            >
              適用
            </Button>
            <a href="/admin/audit-logs" className={secondaryLink}>
              クリア
            </a>
          </div>
        </form>
      </FilterBar>

      {logs.length === 0 ? (
        <EmptyState
          title="該当するログがありません。"
          description="フィルタ条件を変更して再度お試しください。"
          actions={
            <a href="/admin/audit-logs" className={secondaryLink}>
              フィルタをクリア
            </a>
          }
        />
      ) : (
        <Card tone="dark">
          <CardHeader className="border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  監査ログ一覧
                </h2>
                <p className="text-sm text-slate-300">
                  1ページ {pageSize} 件、最新順で表示します。
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span>ページ {page}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table tone="dark">
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>組織</TableHead>
                  <TableHead>操作者</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>プロバイダ</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>追加情報</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const status = getStatusBadge(log);
                  const orgLabel =
                    log.organizationName ||
                    (log.organizationId
                      ? organizationMap.get(log.organizationId) ?? log.organizationId
                      : "全体");
                  const targetLabel =
                    log.targetType && log.targetId
                      ? `${log.targetType} / ${log.targetId}`
                      : log.targetType || log.targetId || "なし";
                  const metadataPreview = formatMetadataPreview(log.metadata ?? {});
                  const metadataText = JSON.stringify(log.metadata ?? {}, null, 2);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-slate-300">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-slate-100">
                        {actionLabels[log.action] ?? log.action}
                      </TableCell>
                      <TableCell className="text-slate-300">{orgLabel}</TableCell>
                      <TableCell className="text-slate-300">
                        {log.actorEmail ?? log.actorUserId ?? "不明"}
                      </TableCell>
                      <TableCell className="text-slate-300">{targetLabel}</TableCell>
                      <TableCell className="text-slate-300">
                        {resolveProviderLabel(log.metadata ?? {})}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <details>
                          <summary className="cursor-pointer text-slate-200 hover:text-slate-100">
                            {metadataPreview}
                          </summary>
                          <pre className="mt-2 max-w-md whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200">
                            {metadataText}
                          </pre>
                        </details>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination
              tone="dark"
              summary={`ページ ${page}（${pageSize}件/ページ）`}
              prevHref={prevHref}
              nextHref={nextHref}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
