import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { listAdminOrganizations } from "@/server/services/admin-organizations";

export default async function AdminOrganizationsPage() {
  const organizations = await listAdminOrganizations();

  return (
    <div className="space-y-8">
      <PageHeader
        title="組織管理"
        description="組織一覧とメンバー管理の入り口です。"
        tone="dark"
      />

      <Card tone="dark">
        <CardHeader className="border-slate-800">
          <p className="text-base font-semibold text-slate-100">組織一覧</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {organizations.length === 0 ? (
            <EmptyState
              title="組織がありません。"
              description="組織を作成してからメンバー管理を行ってください。"
            />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-sm text-slate-400">
                <tr>
                  <th className="py-3 pr-4">組織名</th>
                  <th className="py-3 pr-4">メンバー数</th>
                  <th className="py-3">操作</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="border-b border-slate-800">
                    <td className="py-3 pr-4">{org.name}</td>
                    <td className="py-3 pr-4 text-sm text-slate-400">
                      {org.memberCount}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="inline-flex min-h-[44px] items-center text-sm font-semibold text-amber-300 hover:text-amber-200"
                      >
                        詳細へ
                      </Link>
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
