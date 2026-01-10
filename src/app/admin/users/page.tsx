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
import { listAdminOrganizations } from "@/server/services/admin-organizations";
import { isSupabaseAdminConfigured } from "@/server/utils/env";
import {
  type AdminUserStatus,
  listAdminUsers,
} from "@/server/services/admin-users";
import { checkUserBlocksSchema } from "@/server/services/diagnostics";

import { CreateUserForm } from "./CreateUserForm";
import { DeleteUserForm } from "./DeleteUserForm";
import { InviteTemplatePanel } from "./InviteTemplatePanel";
import { ToggleUserStatusForm } from "./ToggleUserStatusForm";

function formatDate(value: string | null) {
  if (!value) return "不明";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "不明";
  return date.toLocaleString("ja-JP");
}

function getStatusLabel(status: AdminUserStatus) {
  if (status === "disabled") {
    return { label: "無効", variant: "warning" as const };
  }
  if (status === "invited") {
    return { label: "招待中", variant: "muted" as const };
  }
  return { label: "有効", variant: "success" as const };
}

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

  return (
    <div className="space-y-8">
      <PageHeader
        title="ユーザー管理"
        description="システム管理者がユーザーの招待、無効化、削除を行います。"
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
              className="bg-amber-400 text-slate-900 hover:bg-amber-300 focus-visible:outline-amber-300"
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
            管理者/招待中/無効を一覧で確認します。
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
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-sm text-slate-400">
              <tr>
                <th className="py-2 pr-4">メール</th>
                <th className="py-2 pr-4">作成日</th>
                <th className="py-2 pr-4">所属組織数</th>
                <th className="py-2 pr-4">システム管理</th>
                <th className="py-2 pr-4">状態</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-800">
                  <td className="py-3 pr-4 text-sm">{user.email ?? "不明"}</td>
                  <td className="py-3 pr-4 text-sm text-slate-400">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-3 pr-4 text-sm text-slate-300">
                    {user.membershipCount}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={user.isSystemAdmin ? "success" : "muted"}>
                      {user.isSystemAdmin ? "管理者" : "一般"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    {(() => {
                      const status = getStatusLabel(user.status);
                      return (
                        <Badge variant={status.variant}>{status.label}</Badge>
                      );
                    })()}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-2">
                      <ToggleUserStatusForm
                        userId={user.id}
                        email={user.email}
                        isDisabled={user.isDisabled}
                        userBlocksReady={userBlocksReady}
                        userBlocksMessage={userBlocksMessage}
                      />
                      <DeleteUserForm userId={user.id} email={user.email} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
