import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { ProviderType } from "@/server/providers/types";
import { listLocations } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import {
  listReviewsInboxPage,
  type ReviewsInboxFilters,
} from "@/server/services/reviews-inbox";

import { ReviewInboxReplyForm } from "./ReviewInboxReplyForm";

type SearchParams = {
  q?: string;
  provider?: string;
  locationId?: string;
  period?: string;
  unreplied?: string;
  page?: string;
};

const providerOptions = [
  { value: "all", label: "すべて" },
  { value: ProviderType.GoogleBusinessProfile, label: "Google" },
  { value: ProviderType.Meta, label: "Meta" },
];

const periodOptions = [
  { value: "7d", label: "過去7日" },
  { value: "30d", label: "過去30日" },
  { value: "all", label: "全期間" },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "不明";
  return date.toLocaleString("ja-JP");
}

function formatRating(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

function resolvePeriod(period?: string): { period: string; from: string | null } {
  if (period === "7d") {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return { period, from: from.toISOString() };
  }
  if (period === "30d") {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return { period, from: from.toISOString() };
  }
  return { period: "all", from: null };
}

function resolveProvider(value?: string): ReviewsInboxFilters["provider"] {
  if (value === ProviderType.GoogleBusinessProfile) return value;
  if (value === ProviderType.Meta) return value;
  return "all";
}

function providerLabel(provider: ProviderType) {
  if (provider === ProviderType.GoogleBusinessProfile) return "Google";
  if (provider === ProviderType.Meta) return "Meta";
  return "未対応";
}

export default async function ReviewsInboxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams: SearchParams = (await searchParams) ?? {};
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          レビュー受信箱
        </h1>
        <p className="text-sm text-slate-500">
          ログイン後にレビュー対応を開始できます。
        </p>
        <Link href="/auth/sign-in" className="text-amber-600 underline">
          サインインへ
        </Link>
      </div>
    );
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          レビュー受信箱
        </h1>
        <p className="text-sm text-slate-500">
          所属組織が見つかりません。管理者に確認してください。
        </p>
      </div>
    );
  }

  const locations = await listLocations(org.id);
  const role = await getMembershipRole(user.id, org.id);
  const canReply = hasRequiredRole(role, "admin");

  const pageNumber = Number(resolvedSearchParams.page ?? 1);
  const page = Number.isFinite(pageNumber) ? Math.max(pageNumber, 1) : 1;
  const onlyUnreplied = resolvedSearchParams.unreplied === "1";
  const { period, from } = resolvePeriod(resolvedSearchParams.period);
  const provider = resolveProvider(resolvedSearchParams.provider);
  const locationId =
    resolvedSearchParams.locationId && resolvedSearchParams.locationId !== "all"
      ? resolvedSearchParams.locationId
      : null;

  const inboxPage = await listReviewsInboxPage({
    organizationId: org.id,
    page,
    filters: {
      onlyUnreplied,
      provider,
      locationId,
      from,
      to: null,
      query: resolvedSearchParams.q ?? "",
    },
  });

  const totalPages = Math.max(
    1,
    Math.ceil(inboxPage.total / inboxPage.pageSize)
  );
  const queryParams = new URLSearchParams();
  if (resolvedSearchParams.q) {
    queryParams.set("q", resolvedSearchParams.q);
  }
  if (provider !== "all") {
    queryParams.set("provider", provider);
  }
  if (locationId) {
    queryParams.set("locationId", locationId);
  }
  if (period !== "all") {
    queryParams.set("period", period);
  }
  if (onlyUnreplied) {
    queryParams.set("unreplied", "1");
  }

  const prevQuery = new URLSearchParams(queryParams);
  const nextQuery = new URLSearchParams(queryParams);
  if (page > 1) {
    prevQuery.set("page", String(page - 1));
  }
  if (page < totalPages) {
    nextQuery.set("page", String(page + 1));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          レビュー受信箱
        </h1>
        <p className="text-sm text-slate-500">
          ロケーションを横断してレビューを確認し、返信対応を進めます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">フィルタ</h2>
          <p className="text-xs text-slate-500">
            未返信のみや期間で絞り込み、対応漏れを減らします。
          </p>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 md:grid-cols-5">
            <Input
              name="q"
              placeholder="投稿者・本文・ロケーション名で検索"
              defaultValue={resolvedSearchParams.q ?? ""}
            />
            <Select name="locationId" defaultValue={locationId ?? "all"}>
              <option value="all">全ロケーション</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
            <Select name="provider" defaultValue={provider}>
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select name="period" defaultValue={period}>
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                name="unreplied"
                value="1"
                defaultChecked={onlyUnreplied}
                className="h-4 w-4 rounded border-slate-300"
              />
              未返信のみ
            </label>
            <div className="md:col-span-5">
              <Button type="submit">適用</Button>
              <Link
                href="/docs/runbooks/reviews-inbox"
                className="ml-4 text-xs text-amber-700 underline"
              >
                運用手順書を見る
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">レビュー一覧</h2>
        <Badge variant="default">{inboxPage.total}件</Badge>
      </div>

      <div className="space-y-4">
        {inboxPage.items.map((review) => {
          const isGoogle =
            review.provider === ProviderType.GoogleBusinessProfile;
          const replyBadge = review.reply
            ? { label: "返信済み", variant: "success" as const }
            : { label: "未返信", variant: "warning" as const };
          return (
            <Card key={review.id} tone="light">
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {review.locationName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Badge variant="muted">{providerLabel(review.provider)}</Badge>
                      <span>★ {formatRating(review.rating)}</span>
                      <span>{formatDate(review.createdAt)}</span>
                      <Badge variant={replyBadge.variant}>{replyBadge.label}</Badge>
                    </div>
                  </div>
                  <Link
                    href={`/app/locations/${review.locationId}`}
                    className="text-xs text-amber-700 underline"
                  >
                    ロケーション詳細へ
                  </Link>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <p className="text-xs font-semibold text-slate-600">
                    投稿者: {review.author ?? "不明"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {review.comment ?? "本文がありません。"}
                  </p>
                </div>

                {isGoogle ? (
                  <div className="space-y-2">
                    {!canReply && !review.reply && (
                      <p className="text-xs text-slate-500">
                        返信は管理者のみ操作できます。
                      </p>
                    )}
                    <ReviewInboxReplyForm
                      locationId={review.locationId}
                      reviewId={review.id}
                      canEdit={canReply}
                      existingReply={review.reply}
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                    このプロバイダのレビュー返信は未対応です。
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {inboxPage.items.length === 0 && (
          <p className="text-sm text-slate-500">
            条件に一致するレビューがありません。
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          {page} / {totalPages} ページ
        </p>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={`/app/reviews?${prevQuery.toString()}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
            >
              前へ
            </Link>
          ) : (
            <span className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1 text-xs text-slate-400">
              前へ
            </span>
          )}
          {page < totalPages ? (
            <Link
              href={`/app/reviews?${nextQuery.toString()}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
            >
              次へ
            </Link>
          ) : (
            <span className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1 text-xs text-slate-400">
              次へ
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
