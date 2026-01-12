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
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { buildHrefWithParams } from "@/lib/pagination";
import { listAdminOrganizations } from "@/server/services/admin-organizations";
import { queryAuditLogs } from "@/server/services/audit-logs";
import { ProviderType } from "@/server/providers/types";

import {
  actionLabels,
  createAuditLogColumns,
  providerLabels,
} from "./columns";

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
  const columns = createAuditLogColumns({ organizationMap });

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
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    {columns.map((column) => (
                      <TableCell
                        key={`${log.id}-${column.header}`}
                        className={column.cellClassName}
                      >
                        {column.cell(log)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
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
