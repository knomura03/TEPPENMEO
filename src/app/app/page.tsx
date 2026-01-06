import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getSessionUser } from "@/server/auth/session";
import { listLocations } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { listPostsForOrganization } from "@/server/services/posts";
import { listReviewsForLocation } from "@/server/services/reviews";

export default async function AppDashboard() {
  const user = await getSessionUser();
  const org = user ? await getPrimaryOrganization(user.id) : null;
  const locations = org ? await listLocations(org.id) : [];
  const recentPosts = org ? await listPostsForOrganization(org.id) : [];
  const recentReviews = locations[0]
    ? await listReviewsForLocation(locations[0].id)
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {org?.name ?? "あなたのワークスペース"}
          </h1>
          <p className="text-sm text-slate-500">
            ロケーションとプロバイダの最新状況を確認できます。
          </p>
        </div>
        <Badge variant="success">最小版</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-500">ロケーション数</p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {locations.length}
            </h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            プロバイダ連携をロケーション単位で管理します。
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-500">最近の投稿</p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {recentPosts.length}
            </h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            下書き/公開の進捗を確認できます。
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-500">最新レビュー</p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {recentReviews[0]?.rating ?? "-"}
            </h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            {recentReviews[0]?.comment ?? "まだレビューがありません。"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-slate-900">
            クイック操作
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row">
          <Link
            href="/app/locations"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            ロケーションを見る
          </Link>
          <Link
            href="/app/locations"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            プロバイダ連携
          </Link>
          <Link
            href="/admin/providers"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            プロバイダ状態を確認
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
