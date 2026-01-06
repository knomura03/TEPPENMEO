import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listOrganizationMembers, getAdminOrganizationById } from "@/server/services/admin-organizations";
import { isSupabaseConfigured } from "@/server/utils/env";

import { AddMemberForm } from "./AddMemberForm";
import { MemberRoleForm, MemberRemoveForm } from "./MemberRowActions";

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;
  const organization = await getAdminOrganizationById(resolved.id);
  if (!organization) notFound();

  const members = await listOrganizationMembers(organization.id);
  const supabaseReady = isSupabaseConfigured();
  const roleLabels: Record<string, string> = {
    owner: "オーナー",
    admin: "管理者",
    member: "メンバー",
    viewer: "閲覧",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">組織メンバー管理</h1>
        <p className="text-sm text-slate-300">
          {organization.name} のメンバーを管理します。
        </p>
      </div>

      {!supabaseReady && (
        <Card className="border-amber-400/40 bg-amber-900/20 text-amber-100">
          <CardHeader>
            <p className="text-sm font-semibold">Supabase未設定</p>
          </CardHeader>
          <CardContent className="text-xs text-amber-100/80">
            実際のメンバー変更はサービスロールキーが必要です。
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-700 bg-slate-900 text-slate-100">
        <CardHeader>
          <p className="text-sm font-semibold">メンバー追加</p>
          <p className="text-xs text-slate-400">
            既存ユーザーをメールで指定して追加します。
          </p>
        </CardHeader>
        <CardContent>
          <AddMemberForm organizationId={organization.id} />
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-900 text-slate-100">
        <CardHeader>
          <p className="text-sm font-semibold">メンバー一覧</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-xs text-slate-400">
              <tr>
                <th className="py-2 pr-4">メール</th>
                <th className="py-2 pr-4">ロール</th>
                <th className="py-2 pr-4">ロール変更</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {members.map((member) => (
                <tr key={member.userId} className="border-b border-slate-800">
                  <td className="py-3 pr-4 text-sm">
                    {member.email ?? "不明"}
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-300">
                    {roleLabels[member.role] ?? member.role}
                  </td>
                  <td className="py-3 pr-4">
                    <MemberRoleForm
                      organizationId={organization.id}
                      userId={member.userId}
                      role={member.role}
                    />
                  </td>
                  <td className="py-3">
                    <MemberRemoveForm
                      organizationId={organization.id}
                      userId={member.userId}
                    />
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td className="py-6 text-sm text-slate-400" colSpan={4}>
                    メンバーがいません。
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
