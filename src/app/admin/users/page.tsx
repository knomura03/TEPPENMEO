import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/server/utils/env";
import { listAdminUsers } from "@/server/services/admin-users";

import { CreateUserForm } from "./CreateUserForm";
import { DeleteUserForm } from "./DeleteUserForm";

function formatDate(value: string | null) {
  if (!value) return "不明";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "不明";
  return date.toLocaleString("ja-JP");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolved = await searchParams;
  const query = resolved.q ?? "";
  const users = await listAdminUsers(query);
  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">ユーザー管理</h1>
        <p className="text-sm text-slate-300">
          システム管理者がユーザーの作成と削除を行います。
        </p>
      </div>

      {!supabaseReady && (
        <Card className="border-amber-400/40 bg-amber-900/20 text-amber-100">
          <CardHeader>
            <p className="text-sm font-semibold">Supabase未設定</p>
          </CardHeader>
          <CardContent className="text-xs text-amber-100/80">
            実際のユーザー操作はサービスロールキーが必要です。
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-700 bg-slate-900 text-slate-100">
        <CardHeader>
          <p className="text-sm font-semibold">ユーザー作成</p>
          <p className="text-xs text-slate-400">
            招待メールまたは仮パスワード方式で作成します。
          </p>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
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
                    <Badge variant={user.isDisabled ? "warning" : "success"}>
                      {user.isDisabled ? "無効" : "有効"}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <DeleteUserForm userId={user.id} email={user.email} />
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
