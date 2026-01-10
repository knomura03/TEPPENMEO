import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  FilterBar,
  adminActionPrimaryClass,
  adminActionSecondaryClass,
  adminFieldClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/ui/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
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

  const buildPageLink = (nextPage: number) => {
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
    params.set("page", String(nextPage));
    return `/admin/audit-logs?${params.toString()}`;
  };

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
          <a href={buildExportLink()} className={adminActionSecondaryClass}>
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
            <label className={adminLabelClass}>期間（開始）</label>
            <input
              type="date"
              name="from"
              defaultValue={filters.from}
              className={adminFieldClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={adminLabelClass}>期間（終了）</label>
            <input
              type="date"
              name="to"
              defaultValue={filters.to}
              className={adminFieldClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={adminLabelClass}>操作</label>
            <select
              name="action"
              defaultValue={filters.action}
              className={adminSelectClass}
            >
              <option value="">すべて</option>
              {Object.entries(actionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={adminLabelClass}>組織</label>
            <select
              name="org"
              defaultValue={filters.organizationId}
              className={adminSelectClass}
            >
              <option value="">すべて</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={adminLabelClass}>操作者（メール）</label>
            <input
              name="actor"
              defaultValue={filters.actor}
              placeholder="admin@example.com"
              className={adminFieldClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={adminLabelClass}>プロバイダ</label>
            <select
              name="provider"
              defaultValue={filters.providerType}
              className={adminSelectClass}
            >
              <option value="all">すべて</option>
              {Object.entries(providerLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4">
            <label className={adminLabelClass}>自由検索</label>
            <input
              name="text"
              defaultValue={filters.text}
              placeholder="action/target/metadata を検索"
              className={adminFieldClass}
            />
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <button type="submit" form={filterFormId} className={adminActionPrimaryClass}>
              適用
            </button>
            <a href="/admin/audit-logs" className={adminActionSecondaryClass}>
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
            <a href="/admin/audit-logs" className={adminActionSecondaryClass}>
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
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-sm text-slate-400">
                <tr>
                  <th className="py-3 pr-4">日時</th>
                  <th className="py-3 pr-4">操作</th>
                  <th className="py-3 pr-4">組織</th>
                  <th className="py-3 pr-4">操作者</th>
                  <th className="py-3 pr-4">対象</th>
                  <th className="py-3 pr-4">状態</th>
                  <th className="py-3 pr-4">追加情報</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
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
                    <tr key={log.id} className="border-b border-slate-800">
                      <td className="py-3 pr-4 text-slate-300">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-3 pr-4 text-slate-100">
                        {actionLabels[log.action] ?? log.action}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{orgLabel}</td>
                      <td className="py-3 pr-4 text-slate-300">
                        {log.actorEmail ?? log.actorUserId ?? "不明"}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{targetLabel}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-300">
                        <details>
                          <summary className="cursor-pointer text-slate-200 hover:text-slate-100">
                            {metadataPreview}
                          </summary>
                          <pre className="mt-2 max-w-md whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200">
                            {metadataText}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
              <div>
                {page > 1 && (
                  <a href={buildPageLink(page - 1)} className={adminActionSecondaryClass}>
                    前へ
                  </a>
                )}
              </div>
              <div>
                {hasNext && (
                  <a href={buildPageLink(page + 1)} className={adminActionSecondaryClass}>
                    次へ
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
