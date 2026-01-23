import { notFound } from "next/navigation";

import { Callout } from "@/components/ui/Callout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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
    admin: "組織管理者",
    member: "メンバー",
    viewer: "閲覧",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="組織メンバー管理"
        description={`${organization.name} のメンバーを管理します。`}
        tone="light"
      />

      {!supabaseReady && (
        <Callout title="Supabase未設定" tone="warning">
          <p>原因: SUPABASE_SERVICE_ROLE_KEY が未設定です。</p>
          <p>次にやること: `.env.local` に設定してから操作してください。</p>
        </Callout>
      )}

      <Card tone="light">
        <CardHeader className="border-slate-200">
          <p className="text-base font-semibold text-slate-900">メンバー追加</p>
          <p className="text-sm text-slate-600">
            既存ユーザーをメールで指定して追加します。
          </p>
        </CardHeader>
        <CardContent>
          <AddMemberForm organizationId={organization.id} />
        </CardContent>
      </Card>

      <Card tone="light">
        <CardHeader className="border-slate-200">
          <p className="text-base font-semibold text-slate-900">メンバー一覧</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {members.length === 0 ? (
            <EmptyState
              title="メンバーがいません。"
              description="ユーザーを追加してロールを設定してください。"
            />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-sm text-slate-500">
                <tr>
                  <th className="py-3 pr-4">メール</th>
                  <th className="py-3 pr-4">ロール</th>
                  <th className="py-3 pr-4">ロール変更</th>
                  <th className="py-3">操作</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {members.map((member) => (
                  <tr key={member.userId} className="border-b border-slate-200">
                    <td className="py-3 pr-4 text-sm">
                      {member.email ?? "不明"}
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-600">
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
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
