import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getSessionUser } from "@/server/auth/session";
import { ProviderType } from "@/server/providers/types";
import { getLocationById } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { listPostsForOrganization } from "@/server/services/posts";
import { listProviderConnections } from "@/server/services/provider-connections";
import { listProviderStatus } from "@/server/services/providers";
import { listReviewsForLocation } from "@/server/services/reviews";

const statusLabels = {
  disabled: "パートナー限定/無効",
  not_configured: "資格情報未設定",
  mocked: "モック運用",
  enabled: "準備完了",
};

const postStatusLabels: Record<string, string> = {
  draft: "下書き",
  queued: "送信待ち",
  published: "公開済み",
  failed: "失敗",
};
export default async function LocationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const location = await getLocationById(params.id);
  if (!location) notFound();

  const user = await getSessionUser();
  const org = user ? await getPrimaryOrganization(user.id) : null;
  const providerStatus = listProviderStatus();
  const connections = org ? await listProviderConnections(org.id, user?.id) : [];
  const reviews = await listReviewsForLocation(location.id);
  const posts = org ? await listPostsForOrganization(org.id) : [];

  const connectionLabels = {
    connected: "接続済み",
    not_connected: "未接続",
    reauth_required: "再認可が必要",
  } as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {location.name}
        </h1>
        <p className="text-sm text-slate-500">
          {location.address ?? "住所が未登録です"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            プロバイダ連携
          </h2>
          <p className="text-xs text-slate-500">
            プロバイダごとに接続して同期します。
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {providerStatus.map((provider) => {
            const connection = connections.find(
              (item) => item.provider === provider.type
            );
            const connectionStatus = connection?.status ?? "not_connected";
            const connectionMessage = connection?.message;
            const isGoogle = provider.type === ProviderType.GoogleBusinessProfile;

            return (
              <div
                key={provider.type}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {provider.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {statusLabels[provider.status]}
                    </p>
                  </div>
                  <Badge
                    variant={connectionStatus === "connected" ? "success" : "muted"}
                  >
                    {connectionLabels[connectionStatus]}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {provider.status === "disabled" && (
                    <Badge variant="warning">承認待ち</Badge>
                  )}
                  {connectionStatus === "reauth_required" && (
                    <Badge variant="warning">再認可</Badge>
                  )}
                  {provider.capabilities.canReadReviews && (
                    <Badge variant="default">レビュー</Badge>
                  )}
                  {provider.capabilities.canCreatePosts && (
                    <Badge variant="default">投稿</Badge>
                  )}
                  {provider.capabilities.canSearchPlaces && (
                    <Badge variant="default">検索</Badge>
                  )}
                  {!provider.capabilities.canReadReviews &&
                    !provider.capabilities.canCreatePosts &&
                    !provider.capabilities.canSearchPlaces && (
                      <Badge variant="muted">スタブ</Badge>
                    )}
                </div>
                {connectionMessage && (
                  <p className="mt-3 text-xs text-amber-700">
                    {connectionMessage}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {isGoogle ? (
                    <>
                      {connectionStatus !== "connected" && (
                        <a
                          className={`flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold ${
                            provider.enabled
                              ? "bg-slate-900 text-white"
                              : "pointer-events-none bg-slate-200 text-slate-500"
                          }`}
                          href={
                            provider.enabled
                              ? `/api/providers/google/connect?locationId=${location.id}`
                              : undefined
                          }
                          aria-disabled={!provider.enabled}
                        >
                          {connectionStatus === "reauth_required"
                            ? "再認可"
                            : "接続"}
                        </a>
                      )}
                      {connectionStatus === "connected" && (
                        <form
                          action={`/api/providers/google/disconnect?locationId=${location.id}`}
                          method="post"
                          className="w-full"
                        >
                          <Button variant="secondary" className="w-full">
                            切断
                          </Button>
                        </form>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={!provider.enabled}
                    >
                      {provider.capabilities.canConnectOAuth
                        ? "接続"
                        : "未対応"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">レビュー</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    {review.author ?? "匿名"}
                  </p>
                  <Badge variant="success">{review.rating}</Badge>
                </div>
                <p className="text-xs text-slate-500">{review.comment}</p>
              </div>
            ))}
            {reviews.length === 0 && (
              <p className="text-sm text-slate-500">
                まだレビューがありません。
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">投稿</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {post.content}
                </p>
                <p className="text-xs text-slate-500">
                  状態: {postStatusLabels[post.status] ?? post.status}
                </p>
              </div>
            ))}
            {posts.length === 0 && (
              <p className="text-sm text-slate-500">
                まだ投稿がありません。
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
