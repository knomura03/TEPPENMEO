import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">ユーザー管理</h1>
        <p className="text-sm text-slate-300">
          システム管理者がユーザーの招待、無効化、削除を行います。
        </p>
      </div>

      {!supabaseReady && (
        <Card className="border-amber-400/40 bg-amber-900/20 text-amber-100">
          <CardHeader>
            <p className="text-sm font-semibold">Supabase未設定</p>
          </CardHeader>
          <CardContent className="text-xs text-amber-100/80">
            招待・無効化・削除などの管理操作は
            <code className="mx-1 rounded bg-amber-100/20 px-1">
              SUPABASE_SERVICE_ROLE_KEY
            </code>
            が必要です。
            <code className="mx-1 rounded bg-amber-100/20 px-1">
              .env.local
            </code>
            に設定し、SupabaseのAPI設定を確認してください。
          </CardContent>
        </Card>
      )}

      {userBlocksSchema.status !== "ok" && (
        <Card className="border-amber-400/40 bg-amber-900/20 text-amber-100">
          <CardHeader>
            <p className="text-sm font-semibold">マイグレーション未適用</p>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-amber-100/80">
            <p>
              user_blocks の設定が未適用のため、無効化/有効化が利用できません。
            </p>
            {userBlocksSchema.message && (
              <p className="text-amber-100/70">{userBlocksSchema.message}</p>
            )}
            <a
              href="/docs/runbooks/supabase-migrations"
              className="inline-flex text-amber-200 underline"
            >
              適用手順を確認する
            </a>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-700 bg-slate-900 text-slate-100">
        <CardHeader>
          <p className="text-sm font-semibold">ユーザー作成</p>
          <p className="text-xs text-slate-400">
            招待メール、招待リンク、仮パスワード方式で作成します。
          </p>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-900 text-slate-100">
        <CardHeader>
          <p className="text-sm font-semibold">招待テンプレ</p>
          <p className="text-xs text-slate-400">
            招待リンクを差し込んだ件名/本文を生成してコピーします。
          </p>
        </CardHeader>
        <CardContent>
          <InviteTemplatePanel organizations={organizations} />
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-900 text-slate-100">
        <CardHeader>
          <p className="text-sm font-semibold">ユーザー一覧</p>
          <form className="mt-2 flex flex-wrap gap-2" action="/admin/users">
            <input
              name="q"
              defaultValue={query}
              placeholder="メールで検索"
              className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            />
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <option value="all">状態: すべて</option>
              <option value="active">有効</option>
              <option value="invited">招待中</option>
              <option value="disabled">無効</option>
            </select>
            <select
              name="org"
              defaultValue={organizationId}
              className="h-10 min-w-[180px] rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <option value="all">組織: すべて</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <button className="h-10 rounded-md bg-slate-700 px-4 text-sm text-slate-100 hover:bg-slate-600">
              検索
            </button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-xs text-slate-400">
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
                  <td className="py-3 pr-4 text-xs text-slate-400">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-300">
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
              {users.length === 0 && (
                <tr>
                  <td className="py-6 text-sm text-slate-400" colSpan={6}>
                    該当するユーザーがいません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
