import Link from "next/link";
import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildHrefWithParams } from "@/lib/pagination";
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

const actionLinkSecondary =
  buttonStyles({ variant: "secondary", size: "md" });
const actionLinkAccent =
  buttonStyles({
    variant: "secondary",
    size: "md",
    className: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  });

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
  const basePath = "/app/reviews";
  const prevHref =
    page > 1
      ? buildHrefWithParams(basePath, resolvedSearchParams, {
          page: page - 1,
        })
      : null;
  const nextHref =
    page < totalPages
      ? buildHrefWithParams(basePath, resolvedSearchParams, {
          page: page + 1,
        })
      : null;
  const pageSummary = `全${inboxPage.total}件 / ${page} / ${totalPages}ページ`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          レビュー受信箱
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          ロケーションを横断してレビューを確認し、返信対応を進めます。
        </p>
      </div>

      <Card tone="light">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">フィルタ</h2>
          <p className="text-sm text-slate-600">
            未返信のみや期間で絞り込み、対応漏れを減らします。
          </p>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <FormField label="検索">
                <Input
                  name="q"
                  placeholder="投稿者・本文・ロケーション名で検索"
                  defaultValue={resolvedSearchParams.q ?? ""}
                />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <FormField label="ロケーション">
                <Select name="locationId" defaultValue={locationId ?? "all"}>
                  <option value="all">全ロケーション</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="md:col-span-1">
              <FormField label="プロバイダ">
                <Select name="provider" defaultValue={provider}>
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="md:col-span-1">
              <FormField label="期間">
                <Select name="period" defaultValue={period}>
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                name="unreplied"
                value="1"
                defaultChecked={onlyUnreplied}
                className="h-4 w-4 rounded border-slate-300"
              />
              未返信のみ
            </label>
            <div className="flex flex-wrap items-center gap-3 md:col-span-6">
              <Button type="submit" size="md">
                適用
              </Button>
              <Link
                href="/docs/runbooks/reviews-inbox"
                className={actionLinkAccent}
              >
                運用手順書を見る
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card tone="light">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">レビュー一覧</h2>
            <Badge variant="default">{inboxPage.total}件</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {inboxPage.items.length === 0 ? (
            <EmptyState
              title="条件に一致するレビューがありません。"
              description="レビュー同期を実行するか、条件を調整してください。"
              actions={
                <Link href="/app/locations" className={actionLinkSecondary}>
                  ロケーションへ
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>ロケーション</TableHead>
                  <TableHead>プロバイダ</TableHead>
                  <TableHead>評価</TableHead>
                  <TableHead>投稿者</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inboxPage.items.map((review) => {
                  const isGoogle =
                    review.provider === ProviderType.GoogleBusinessProfile;
                  const replyBadge = review.reply
                    ? { label: "返信済み", variant: "success" as const }
                    : { label: "未返信", variant: "warning" as const };
                  return (
                    <Fragment key={review.id}>
                      <TableRow>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(review.createdAt)}
                        </TableCell>
                        <TableCell>{review.locationName}</TableCell>
                        <TableCell>
                          <Badge variant="muted">
                            {providerLabel(review.provider)}
                          </Badge>
                        </TableCell>
                        <TableCell>★ {formatRating(review.rating)}</TableCell>
                        <TableCell>{review.author ?? "不明"}</TableCell>
                        <TableCell>
                          <Badge variant={replyBadge.variant}>
                            {replyBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/app/locations/${review.locationId}`}
                            className="text-sm font-semibold text-amber-700 underline"
                          >
                            ロケーション詳細へ
                          </Link>
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50/40 hover:bg-slate-50/40">
                        <TableCell colSpan={7} className="space-y-4">
                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-800">
                            <p className="text-sm font-semibold text-slate-600">
                              投稿者: {review.author ?? "不明"}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-slate-800">
                              {review.comment ?? "本文がありません。"}
                            </p>
                          </div>
                          {isGoogle ? (
                            <div className="space-y-2">
                              {!canReply && !review.reply && (
                                <p className="text-sm text-slate-500">
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
                            <Card tone="amber">
                              <CardContent className="text-sm text-amber-100">
                                <p className="font-semibold">Metaの返信は未対応</p>
                                <p className="mt-1 text-amber-100/80">
                                  現時点ではGoogleレビューのみ返信できます。
                                </p>
                              </CardContent>
                            </Card>
                          )}
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        summary={pageSummary}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </div>
  );
}
