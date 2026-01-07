import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listAdminOrganizations } from "@/server/services/admin-organizations";

export default async function AdminOrganizationsPage() {
  const organizations = await listAdminOrganizations();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">組織管理</h1>
        <p className="text-sm text-slate-300">
          組織一覧とメンバー管理の入り口です。
        </p>
      </div>

      <Card tone="dark">
        <CardHeader>
          <p className="text-sm font-semibold">組織一覧</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-xs text-slate-400">
              <tr>
                <th className="py-2 pr-4">組織名</th>
                <th className="py-2 pr-4">メンバー数</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {organizations.map((org) => (
                <tr key={org.id} className="border-b border-slate-800">
                  <td className="py-3 pr-4">{org.name}</td>
                  <td className="py-3 pr-4 text-xs text-slate-400">
                    {org.memberCount}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="text-xs font-semibold text-amber-300 hover:text-amber-200"
                    >
                      詳細へ
                    </Link>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td className="py-6 text-sm text-slate-400" colSpan={3}>
                    組織がありません。
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
