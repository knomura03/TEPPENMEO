import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { toProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import {
  listGoogleLocationCandidates,
  toUiError as toGoogleUiError,
} from "@/server/services/google-business-profile";
import { getLocationProviderLink } from "@/server/services/location-provider-links";
import { getLocationById } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import {
  listMetaPageCandidates,
  toUiError as toMetaUiError,
} from "@/server/services/meta";
import { getMediaConfig } from "@/server/services/media";
import {
  listPostHistoryPage,
  type PostHistoryPage,
} from "@/server/services/post-history";
import { listProviderConnections } from "@/server/services/provider-connections";
import { listProviderStatus } from "@/server/services/providers";
import { getProviderAccount } from "@/server/services/provider-accounts";
import { listLatestReviewReplies } from "@/server/services/review-replies";
import { listReviewsForLocation } from "@/server/services/reviews";
import { isMockMode } from "@/server/utils/feature-flags";

import { GoogleGbpPanel } from "./GoogleGbpPanel";
import { MetaPanel } from "./MetaPanel";
import { PostHistoryPanel } from "./PostHistoryPanel";
import { ReviewReplyForm } from "./ReviewReplyForm";

const statusLabels = {
  disabled: "パートナー限定/無効",
  not_configured: "資格情報未設定",
  mocked: "モック運用",
  enabled: "準備完了",
};

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const location = await getLocationById(resolvedParams.id);
  if (!location) notFound();

  const user = await getSessionUser();
  const org = user ? await getPrimaryOrganization(user.id) : null;
  const role = user && org ? await getMembershipRole(user.id, org.id) : null;
  const canEdit = hasRequiredRole(role, "admin");
  const providerStatus = listProviderStatus();
  const connections = org ? await listProviderConnections(org.id, user?.id) : [];
  const reviews = await listReviewsForLocation(location.id);
  const emptyPostHistoryPage: PostHistoryPage = {
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
    filters: { status: "all", target: "all", search: "" },
  };
  const postHistoryPage = org
    ? await listPostHistoryPage({
        organizationId: org.id,
        locationId: location.id,
        page: 1,
        pageSize: 10,
        filters: { status: "all", target: "all", search: "" },
      })
    : emptyPostHistoryPage;
  const mediaConfig = getMediaConfig();

  const googleAccount = org
    ? await getProviderAccount(org.id, ProviderType.GoogleBusinessProfile)
    : null;
  const googleLink = await getLocationProviderLink(
    location.id,
    ProviderType.GoogleBusinessProfile
  );
  const metaLink = await getLocationProviderLink(location.id, ProviderType.Meta);

  let googleCandidates = [] as Array<{
    id: string;
    name: string;
    address?: string | null;
    metadata?: Record<string, unknown>;
  }>;
  let googleCandidatesError: { cause: string; nextAction: string } | null = null;
  if (org) {
    try {
      googleCandidates = await listGoogleLocationCandidates({
        organizationId: org.id,
        actorUserId: user?.id ?? null,
      });
    } catch (error) {
      const providerError = toProviderError(
        ProviderType.GoogleBusinessProfile,
        error
      );
      googleCandidatesError = toGoogleUiError(providerError);
    }
  }

  let metaCandidates = [] as Array<{
    id: string;
    name: string;
    instagram?: { id: string; username?: string | null } | null;
  }>;
  let metaCandidatesError: { cause: string; nextAction: string } | null = null;
  if (org) {
    try {
      metaCandidates = await listMetaPageCandidates({
        organizationId: org.id,
        actorUserId: user?.id ?? null,
      });
    } catch (error) {
      const providerError = toProviderError(ProviderType.Meta, error);
      metaCandidatesError = toMetaUiError(providerError);
    }
  }

  const googleConnection = connections.find(
    (item) => item.provider === ProviderType.GoogleBusinessProfile
  );
  const metaConnection = connections.find(
    (item) => item.provider === ProviderType.Meta
  );
  const googleStatusLabel =
    googleConnection?.status === "connected"
      ? "接続済み"
      : googleConnection?.status === "reauth_required"
      ? "再認可が必要"
      : "未接続";
  const metaStatusLabel =
    metaConnection?.status === "connected"
      ? "接続済み"
      : metaConnection?.status === "reauth_required"
      ? "再認可が必要"
      : "未接続";
  const googleApiWarning =
    googleAccount?.metadata?.api_access === false
      ? "Google Business ProfileのAPI承認が必要です。"
      : null;
  const lastSyncAt = (googleLink?.metadata?.last_review_sync_at as string) ?? null;

  const replyMap = await listLatestReviewReplies(reviews.map((review) => review.id));

  const connectionLabels = {
    connected: "接続済み",
    not_connected: "未接続",
    reauth_required: "再認可が必要",
  } as const;

  const connectLinkClass = buttonStyles({ variant: "primary", size: "md", className: "w-full" });
  const connectDisabledClass = buttonStyles({
    variant: "secondary",
    size: "md",
    className:
      "w-full border-slate-200 bg-slate-200 text-slate-500 hover:bg-slate-200 pointer-events-none",
  });

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
            連携サービス
          </h2>
          <p className="text-sm text-slate-500">
            連携サービスごとに接続して同期します。
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
            const isMeta = provider.type === ProviderType.Meta;
            const connectHref = isGoogle
              ? `/api/providers/google/connect?locationId=${location.id}`
              : isMeta
              ? `/api/providers/meta/connect?locationId=${location.id}`
              : null;
            const disconnectAction = isGoogle
              ? `/api/providers/google/disconnect?locationId=${location.id}`
              : isMeta
              ? `/api/providers/meta/disconnect?locationId=${location.id}`
              : null;

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
                    <p className="text-sm text-slate-500">
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
                    <Badge variant="default">口コミ</Badge>
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
                      <Badge variant="muted">準備中</Badge>
                    )}
                </div>
                {connectionMessage && (
                  <p className="mt-3 text-sm text-amber-700">
                    {connectionMessage}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {isGoogle || isMeta ? (
                    <>
                      {connectionStatus !== "connected" && (
                        <a
                          className={provider.enabled ? connectLinkClass : connectDisabledClass}
                          href={provider.enabled ? connectHref ?? undefined : undefined}
                          aria-disabled={!provider.enabled}
                        >
                          {connectionStatus === "reauth_required"
                            ? "再認可"
                            : "接続"}
                        </a>
                      )}
                      {connectionStatus === "connected" && (
                        <form
                          action={disconnectAction ?? undefined}
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

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            Google Business Profile
          </h2>
          <p className="text-sm text-slate-500">
            Google店舗（GBP）の紐付けと口コミ同期を行います。
          </p>
        </CardHeader>
        <CardContent>
          <GoogleGbpPanel
            locationId={location.id}
            canEdit={canEdit}
            connectionLabel={googleStatusLabel}
            connectionMessage={googleConnection?.message ?? null}
            apiAccessWarning={googleApiWarning}
            link={
              googleLink
                ? {
                    externalLocationId: googleLink.externalLocationId,
                    metadata: googleLink.metadata,
                  }
                : null
            }
            candidates={googleCandidates}
            candidatesError={googleCandidatesError}
            lastSyncAt={lastSyncAt}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            Meta（Facebook/Instagram）
          </h2>
          <p className="text-sm text-slate-500">
            Facebookページの紐付けと投稿作成を行います。
          </p>
        </CardHeader>
        <CardContent>
          <MetaPanel
            locationId={location.id}
            canEdit={canEdit}
            connectionStatus={metaConnection?.status ?? "not_connected"}
            connectionLabel={metaStatusLabel}
            connectionMessage={metaConnection?.message ?? null}
            googleConnectionStatus={googleConnection?.status ?? "not_connected"}
            googleLink={
              googleLink
                ? {
                    externalLocationId: googleLink.externalLocationId,
                    metadata: googleLink.metadata,
                  }
                : null
            }
            link={
              metaLink
                ? {
                    externalLocationId: metaLink.externalLocationId,
                    metadata: metaLink.metadata,
                  }
                : null
            }
            candidates={metaCandidates}
            candidatesError={metaCandidatesError}
            maxUploadMb={mediaConfig.maxUploadMb}
          />
        </CardContent>
      </Card>

      <PostHistoryPanel
        initialPage={postHistoryPage}
        locationId={location.id}
        canEdit={canEdit}
        isMockMode={isMockMode()}
        metaConnectionStatus={metaConnection?.status ?? "not_connected"}
        googleConnectionStatus={googleConnection?.status ?? "not_connected"}
        googleLinked={Boolean(googleLink)}
      />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">口コミ</h2>
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
              <p className="text-sm text-slate-400">
                投稿日時: {review.createdAt}
              </p>
              <p className="text-sm text-slate-500">{review.comment}</p>
              {review.provider === ProviderType.GoogleBusinessProfile && (
                <div className="mt-3">
                  <ReviewReplyForm
                    locationId={location.id}
                    reviewId={review.id}
                    canEdit={canEdit}
                    existingReply={
                      replyMap[review.id]
                        ? {
                            replyText: replyMap[review.id].replyText,
                            createdAt: replyMap[review.id].createdAt,
                          }
                        : null
                    }
                  />
                </div>
              )}
            </div>
          ))}
          {reviews.length === 0 && (
            <p className="text-sm text-slate-500">
              まだ口コミがありません。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
