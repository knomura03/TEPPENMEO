import Link from "next/link";
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
import { listPostTemplates } from "@/server/services/post-templates";
import { listLatestReviewReplies } from "@/server/services/review-replies";
import { listReviewsForLocation } from "@/server/services/reviews";
import { isMockMode } from "@/server/utils/feature-flags";

import { GoogleGbpPanel } from "./GoogleGbpPanel";
import { MetaPanel } from "./MetaPanel";
import { PostHistoryPanel } from "./PostHistoryPanel";
import { ReviewReplyForm } from "./ReviewReplyForm";

const statusLabels = {
  disabled: "準備中",
  not_configured: "設定が必要",
  mocked: "テスト運用中",
  enabled: "利用可能",
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
  const reviews = (await listReviewsForLocation(location.id)).filter(
    (review) => review.provider === ProviderType.GoogleBusinessProfile
  );
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
  const { templates: postTemplates, reason: postTemplatesReason } = org
    ? await listPostTemplates({
        organizationId: org.id,
        includeArchived: false,
      })
    : { templates: [], reason: null };

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
      ? "つながっています"
      : googleConnection?.status === "reauth_required"
      ? "つなぎ直しが必要"
      : "未接続";
  const metaStatusLabel =
    metaConnection?.status === "connected"
      ? "つながっています"
      : metaConnection?.status === "reauth_required"
      ? "つなぎ直しが必要"
      : "未接続";
  const googleApiWarning =
    googleAccount?.metadata?.api_access === false
      ? "Google Business ProfileのAPI承認が必要です。"
      : null;
  const lastSyncAt = (googleLink?.metadata?.last_review_sync_at as string) ?? null;

  const replyMap = await listLatestReviewReplies(reviews.map((review) => review.id));
  const hasGoogleConnection = googleConnection?.status === "connected";
  const hasMetaConnection = metaConnection?.status === "connected";
  const hasAnyConnection = hasGoogleConnection || hasMetaConnection;
  const needsReauth = [googleConnection, metaConnection].some(
    (connection) => connection?.status === "reauth_required"
  );
  const hasLinkedStore = Boolean(googleLink) || Boolean(metaLink);
  const hasSyncedReviews = Boolean(lastSyncAt);
  const hasReplies = Object.keys(replyMap).length > 0;
  const hasPosts = postHistoryPage.total > 0;

  const stepStatusStyles: Record<
    "done" | "todo" | "attention",
    { label: string; variant: "success" | "warning" | "muted" }
  > = {
    done: { label: "完了", variant: "success" },
    todo: { label: "未完了", variant: "muted" },
    attention: { label: "注意", variant: "warning" },
  };

  const steps = [
    {
      key: "connect",
      title: "連携サービスをつなぐ",
      description: "GoogleやSNSの連携を開始します。",
      status: needsReauth ? "attention" : hasAnyConnection ? "done" : "todo",
      actionLabel: needsReauth ? "つなぎ直す" : "連携サービスをつなぐ",
      href: "#connect-services",
    },
    {
      key: "link-store",
      title: "この店舗を選ぶ",
      description: "Googleの店舗情報やFacebookページを選びます。",
      status: hasLinkedStore ? "done" : "todo",
      actionLabel: "店舗を選ぶ",
      href: "#link-store",
    },
    {
      key: "sync-reviews",
      title: "口コミ・コメントを取り込む",
      description: "最新の口コミやコメントを取り込みます。",
      status: hasSyncedReviews ? "done" : "todo",
      actionLabel: "口コミを取り込む",
      href: "#google-sync",
    },
    {
      key: "reply",
      title: "返信する",
      description: "受信箱で口コミ・コメントに返信します。",
      status: hasReplies ? "done" : "todo",
      actionLabel: "受信箱を開く",
      href: "/app/reviews",
    },
    {
      key: "post",
      title: "投稿する",
      description: "テンプレを使って投稿を送信します。",
      status: hasPosts ? "done" : "todo",
      actionLabel: "投稿エリアへ",
      href: "#post-compose",
    },
  ] as const;

  const mainProviders = providerStatus.filter(
    (provider) =>
      provider.type === ProviderType.GoogleBusinessProfile ||
      provider.type === ProviderType.Meta
  );
  const otherProviders = providerStatus.filter(
    (provider) =>
      provider.type !== ProviderType.GoogleBusinessProfile &&
      provider.type !== ProviderType.Meta
  );

  const connectionLabels = {
    connected: "つながっています",
    not_connected: "未接続",
    reauth_required: "つなぎ直しが必要",
  } as const;

  const connectLinkClass = buttonStyles({ variant: "primary", size: "md", className: "w-full" });
  const connectDisabledClass = buttonStyles({
    variant: "secondary",
    size: "md",
    className:
      "w-full border-slate-200 bg-slate-200 text-slate-500 hover:bg-slate-200 pointer-events-none",
  });
  const stepActionClass = buttonStyles({ variant: "primary", size: "sm" });
  const templatesNotice =
    postTemplatesReason
      ? "テンプレートを使うには管理者側の設定が必要です。"
      : postTemplates.length === 0
      ? "テンプレートはまだありません。必要なら作成してください。"
      : null;
  const recentReviews = reviews.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">{location.name}</h1>
        <p className="text-sm text-slate-500">
          {location.address ?? "住所が未登録です"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">今日やること</h2>
          <p className="text-sm text-slate-500">
            未完了の項目だけ開いてあります。上から順に進めると迷いません。
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step) => {
            const style = stepStatusStyles[step.status];
            return (
              <details
                key={step.key}
                open={step.status !== "done"}
                className="rounded-md border border-slate-200 bg-white p-4"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {step.title}
                    </p>
                    <p className="text-sm text-slate-500">{step.description}</p>
                  </div>
                  <Badge variant={style.variant}>{style.label}</Badge>
                </summary>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  {step.href.startsWith("#") ? (
                    <a className={stepActionClass} href={step.href}>
                      {step.actionLabel}
                    </a>
                  ) : (
                    <Link className={stepActionClass} href={step.href}>
                      {step.actionLabel}
                    </Link>
                  )}
                  <span className="text-xs text-slate-500">
                    {step.status === "done" ? "完了済みです。" : "次に進めましょう。"}
                  </span>
                </div>
              </details>
            );
          })}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">初めての設定</h2>
          <p className="text-sm text-slate-500">
            連携サービスをつなぎ、この店舗を選ぶところまで進めます。
          </p>
        </div>

        <Card id="connect-services">
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900">
              連携サービスをつなぐ
            </h3>
            <p className="text-sm text-slate-500">
              Google・Facebook・Instagramの連携を開始します。
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {mainProviders.map((provider) => {
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
              const providerLabel = isGoogle
                ? "Google"
                : isMeta
                ? "Facebook/Instagram"
                : provider.name;

              return (
                <div
                  key={provider.type}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {providerLabel}
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
                      <Badge variant="warning">つなぎ直し</Badge>
                    )}
                    {provider.capabilities.canReadReviews && (
                      <Badge variant="default">口コミ</Badge>
                    )}
                    {provider.capabilities.canCreatePosts && (
                      <Badge variant="default">投稿</Badge>
                    )}
                    {!provider.capabilities.canReadReviews &&
                      !provider.capabilities.canCreatePosts && (
                        <Badge variant="muted">準備中</Badge>
                      )}
                  </div>
                  {connectionMessage && (
                    <p className="mt-3 text-sm text-amber-700">
                      {connectionMessage}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {connectionStatus !== "connected" && (
                      <a
                        className={provider.enabled ? connectLinkClass : connectDisabledClass}
                        href={provider.enabled ? connectHref ?? undefined : undefined}
                        aria-disabled={!provider.enabled}
                      >
                        {connectionStatus === "reauth_required"
                          ? "つなぎ直す"
                          : "つなぐ"}
                      </a>
                    )}
                    {connectionStatus === "connected" && (
                      <form
                        action={disconnectAction ?? undefined}
                        method="post"
                        className="w-full"
                      >
                        <Button variant="secondary" className="w-full">
                          つなぎを解除
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
          {otherProviders.length > 0 && (
            <div className="px-6 pb-6">
              <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  その他の連携サービス（準備中）
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {otherProviders.map((provider) => (
                    <div
                      key={provider.type}
                      className="rounded-md border border-slate-200 bg-white p-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {provider.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {statusLabels[provider.status]}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </Card>

        <Card id="link-store">
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900">
              この店舗を選ぶ
            </h3>
            <p className="text-sm text-slate-500">
              Googleの店舗情報やFacebookページを選び、この店舗とつなぎます。
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
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
              templates={postTemplates}
              templatesNotice={templatesNotice}
              composerDefaultOpen={!hasPosts}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">毎日の運用</h2>
          <p className="text-sm text-slate-500">
            口コミ・コメントの対応や投稿など、日々の更新を進めます。
          </p>
        </div>

        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900">
              口コミ・コメント
            </h3>
            <p className="text-sm text-slate-500">
              返信や管理は受信箱から行います。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  {lastSyncAt ? `最終取り込み: ${lastSyncAt}` : "まだ取り込みがありません。"}
                </p>
              </div>
              <Link href="/app/reviews" className={stepActionClass}>
                受信箱を開く
              </Link>
            </div>
            <details className="rounded-md border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                最近の口コミを見る
              </summary>
              <div className="mt-3 space-y-3">
                {recentReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">
                        {review.author ?? "匿名"}
                      </p>
                      <Badge variant="success">
                        {review.rating === null ? "-" : review.rating}
                      </Badge>
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
                {reviews.length > recentReviews.length && (
                  <p className="text-xs text-slate-500">
                    すべての口コミは受信箱から確認できます。
                  </p>
                )}
              </div>
            </details>
          </CardContent>
        </Card>

        <details className="rounded-md border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
            投稿の履歴を見る
          </summary>
          <div className="mt-4">
            <PostHistoryPanel
              initialPage={postHistoryPage}
              locationId={location.id}
              canEdit={canEdit}
              isMockMode={isMockMode()}
              metaConnectionStatus={metaConnection?.status ?? "not_connected"}
              googleConnectionStatus={googleConnection?.status ?? "not_connected"}
              googleLinked={Boolean(googleLink)}
            />
          </div>
        </details>
      </section>
    </div>
  );
}
