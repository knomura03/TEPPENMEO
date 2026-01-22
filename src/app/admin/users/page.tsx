import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Callout } from "@/components/ui/Callout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { getSessionUser } from "@/server/auth/session";
import { isSystemAdmin } from "@/server/auth/rbac";
import { listAdminOrganizations } from "@/server/services/admin-organizations";
import { isSupabaseAdminConfigured } from "@/server/utils/env";
import { listAdminUsers, type AdminUserStatus } from "@/server/services/admin-users";
import { checkUserBlocksSchema } from "@/server/services/diagnostics";

import { CreateUserForm } from "./CreateUserForm";
import { InviteTemplatePanel } from "./InviteTemplatePanel";
import { createAdminUserColumns } from "./columns";

function parseStatus(value: string | undefined): AdminUserStatus | "all" {
  if (!value || value === "all") return "all";
  if (value === "active" || value === "invited" || value === "disabled") {
    return value;
  }
  return "all";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; org?: string }>;
}) {
  const resolved = await searchParams;
  const query = resolved.q ?? "";
  const status = parseStatus(resolved.status);
  const organizationId = resolved.org ?? "all";
  const users = await listAdminUsers({
    query,
    status,
    organizationId,
  });
  const sessionUser = await getSessionUser();
  const currentUserId = sessionUser?.id ?? null;
  const canManageSystemAdmin = sessionUser
    ? await isSystemAdmin(sessionUser.id)
    : false;
  const organizations = await listAdminOrganizations();
  const userBlocksSchema = await checkUserBlocksSchema();
  const userBlocksReady = userBlocksSchema.status === "ok";
  const userBlocksMessage =
    userBlocksSchema.status === "missing"
      ? "user_blocks マイグレーションが未適用のため無効化/有効化は利用できません。"
      : userBlocksSchema.status === "unknown"
        ? "user_blocks の判定に失敗しました。Supabaseの設定を確認してください。"
        : null;
  const supabaseReady = isSupabaseAdminConfigured();
  const filterFormId = "admin-users-filter";
  const secondaryLink = buttonStyles({
    variant: "secondary",
    size: "md",
    className: "border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900",
  });
  const columns = createAdminUserColumns({
    userBlocksReady,
    userBlocksMessage,
    canManageSystemAdmin,
    currentUserId,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="ユーザー管理"
        description="システム管理者がユーザーの招待、無効化、削除を行います。システム管理者の変更は全組織に影響します。"
        tone="dark"
      />

      {!supabaseReady && (
        <Callout tone="warning" title="Supabase未設定">
          <p>原因: SUPABASE_SERVICE_ROLE_KEY が未設定です。</p>
          <p>次にやること: `.env.local` に設定し、SupabaseのAPI設定を確認してください。</p>
        </Callout>
      )}

      {userBlocksSchema.status !== "ok" && (
        <Callout tone="warning" title="マイグレーション未適用">
          <p>原因: user_blocks の設定が未適用です。</p>
          <p>次にやること: マイグレーションを適用してください。</p>
          {userBlocksSchema.message && (
            <p className="text-amber-100/80">{userBlocksSchema.message}</p>
          )}
          <div>
            <a href="/docs/runbooks/supabase-migrations" className={secondaryLink}>
              適用手順を確認する
            </a>
          </div>
        </Callout>
      )}

      <Card tone="dark">
        <CardHeader className="border-slate-800">
          <p className="text-base font-semibold text-slate-100">ユーザー作成</p>
          <p className="text-sm text-slate-300">
            招待メール、招待リンク、仮パスワード方式で作成します。
          </p>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card tone="dark">
        <CardHeader className="border-slate-800">
          <p className="text-base font-semibold text-slate-100">招待テンプレ</p>
          <p className="text-sm text-slate-300">
            招待リンクを差し込んだ件名/本文を生成してコピーします。
          </p>
        </CardHeader>
        <CardContent>
          <InviteTemplatePanel organizations={organizations} />
        </CardContent>
      </Card>

      <FilterBar
        title="ユーザー一覧"
        description="メール・状態・組織で絞り込みできます。"
        footer={
          <>
            <Button
              type="submit"
              form={filterFormId}
              variant="primary"
            >
              検索
            </Button>
            <a href="/admin/users" className={secondaryLink}>
              クリア
            </a>
          </>
        }
      >
        <form id={filterFormId} className="contents" action="/admin/users">
          <div className="md:col-span-2">
            <FormField label="検索" tone="dark">
              <Input
                name="q"
                defaultValue={query}
                placeholder="メールで検索"
                tone="dark"
              />
            </FormField>
          </div>
          <div>
            <FormField label="状態" tone="dark">
              <Select name="status" defaultValue={status} tone="dark">
                <option value="all">すべて</option>
                <option value="active">有効</option>
                <option value="invited">招待中</option>
                <option value="disabled">無効</option>
              </Select>
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="組織" tone="dark">
              <Select name="org" defaultValue={organizationId} tone="dark">
                <option value="all">すべて</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </form>
      </FilterBar>

      <Card tone="dark">
        <CardHeader className="border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-slate-100">一覧</p>
            <Badge variant="muted">{users.length}件</Badge>
          </div>
          <p className="text-sm text-slate-300">
            有効/招待中/無効を一覧で確認します。
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {users.length === 0 ? (
            <EmptyState
              title="該当するユーザーがいません。"
              description="フィルタ条件を見直すか、新規招待を行ってください。"
              actions={
                <a href="/admin/users" className={secondaryLink}>
                  フィルタをクリア
                </a>
              }
            />
          ) : (
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
                {users.map((user) => (
                  <TableRow key={user.id}>
                    {columns.map((column) => (
                      <TableCell
                        key={`${user.id}-${column.header}`}
                        className={column.cellClassName}
                      >
                        {column.cell(user)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
